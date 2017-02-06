"use strict";

const DBRef = require('mongoose').mongo.DBRef;


module.exports = function rate(Schema){
	const s = new Schema({
		item: DBRef.schema,
		iplocation: {},
		device: {},
		rate: {type: Number, index: true}
	}, {
		collection: 'rates',
		created: true,
		submitter: true
	});
	
	s.index({'item.$ref': 1});
	s.index({'item.$id': 1});
	
	s.statics = {
		createNew: function(req, item, rate){
			return this.create({
				item: item.getDBRef().toObject(),
				iplocation: req.ipLocation,
				device: req.device,
				rate: rate,
				submitter: req.user
			});
		},
		bestRated: function(query, cb){
			if(!cb){
				cb = query;
				query = {};
			}
			//TODO: hacer con aggregate
			this.find(query, function(err, r){
				if(err || !r)
					return cb(err, r);
				
				const obj = {};
				const arr = [];
				
				r.forEach(function(o){
					if(!obj[o.item.oid])
						obj[o.item.oid] = {
							item: o.item,
							rating: 0,
							count: 0
						};
					
					obj[o.item.oid].rating += o.rate;
					obj[o.item.oid].count++;
				});
				
				Object.each(obj, (i, o) => {
					o.rating =  o.rating/o.count;
					arr.push(o);
				});
				
				arr.sort(function(a, b){
					return b.rating - a.rating;
				});
				
				if(!arr[0])
					return cb();
				
				const ret = arr[0];
				
				ret.item = ret.item.toObject();
				cb(null, ret);
			});
		},
		bestRatedToday: function(query, cb){
			if(!cb){
				cb = query;
				query = {};
			}
			
			//ayer
			const date = new Date();
			date.setDate(date.getDate() - 1);
			
			query.created = {$gt: date};
			
			this.bestRated(query, (err, r) => {
				if(err || r)
					return cb(err, r);
				
				//last week
				date.setDate(date.getDate() - 6);

				this.bestRated(query, (err, r) => {
					if(err || r)
						return cb(err, r);

					//ever
					delete query.created;

					this.bestRated(query, cb);
				});
			});
		}
	};
	
	return s;
};