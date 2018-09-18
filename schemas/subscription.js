"use strict";

module.exports = function subscription(Schema){
	const s = new Schema({
		email: {type: String, unique: true},
		lang: String,
		subscriptions: {},
		subscriptionUrl: String
	}, {
		collection: 'subscriptions',
		created: true,
		modified: true
	});

	s.methods = {
		merge: function(data){
			this.set('subscriptions', Object.assign(this.get('subscriptions'), data));

			return this;
		},
		get4show: function(req, cb){
			const s = this.subscriptions;
			let count = 0;
			const ret = {};

			Object.each(s, (db, sdb) => {
				Object.each(sdb, (col, sdbc) => {
					if(sdbc.items){
						++count;

						req.site.dbs[db][col].find({_id: {$in: sdbc.items}}, 'title', (err, items) => {
							ret[db + '.' + col] = {
								events: sdbc.events,
								items: items
							};

							if(!--count)
								cb(null, ret);
						});
					} else {
						ret[db + '.' + col] = sdbc;
					}
				});
			});

			if(!count)
				cb(null, ret);
		}
	};

	s.statics = {
		tree: function(cb){
			const ret = {};

			this.find({}, {subscriptions: true, _id: false}, function(err, all){
				all.forEach(function(s){
					s = s.subscriptions;

					Object.each(s, (db, sdb) => {
						if(!ret[db])
							ret[db] = {};

						Object.keys(sdb).forEach(col => {
							if(!ret[db][col])
								ret[db][col] = 1;
							else
								ret[db][col]++;
						});
					});
				});

				cb(err, ret);
			});
		},
		listCollection: function(col, db, cb){
			if(typeof db === 'function'){
				db = this.db.name;
				cb = db;
			}

			const ret = [];
			const query = {};

			query['subscriptions.' + db + '.' + col] = {$exists: true};

			this.find(query, function(err, all){
				all.forEach(function(s){
					ret.push({
						id: s.id,
						email: s.email,
						subscription: s.subscriptions[db][col]
					});
				});

				cb(err, ret);
			});
		},
		getCountByItem: function(itemId, db, collection, cb){
			const query = {};

			query[db + '.' + collection + '.items'] = itemId;

			this.countDocuments(query, cb);
		},
		getCountByItemIncludeNew: function(itemId, db, collection, cb){
			const query = {$or: [{}, {}]};

			query.$or[0]["subscriptions." + db + '.' + collection + '.items'] = itemId;

			query.$or[1]["subscriptions." + db + '.' + collection + '.events'] = 'newItem';

			this.countDocuments(query, (err, c) => {
				this.db.models.user.countDocuments(query, (err, uc) => cb(err, c + uc));
			});
		}
	};

	return s;
};
