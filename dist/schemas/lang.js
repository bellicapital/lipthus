"use strict";

const merge = require('merge-descriptors');
const exec = require('child_process').exec;

module.exports = function lang(Schema, site){
	const exclude = {
		_id: false,
		_mod: false,
		_tag: false,
		__v: false,
		modified: false,
		created: false
	};

	const excludeAll = [
		'_id',
		'_mod',
		'_k',
		'_tag',
		'__v',
		'modified',
		'created'
	];

	const s = new Schema({
		_tag: String,
		_k: {type: String, index: true, unique: true}
	}, {
		collection: 'lang',
		strict: false,
		id: false
	});

	s.index({
		_k: 1,
		_tag: 1
	});

	s.methods = {
		values: function(){
			const ret = this.toObject();

			excludeAll.forEach(function(n){
				delete(ret[n]);
			});

			return ret;
		}
	};

	s.statics = {
		get: function(name){
			return this.findOne({_k: name});
		},
		getValues: function(name){
			return this.get(name)
				.then(r => {
					return r && r.values();
				});
		},
		getFullTree: function(cb){
			this.find().sort({_k: 1}).exec(function(err, r){
				let ret = {};

				Object.values(r, v => {
					const key = v._k;
					const tag = v._tag;

					delete(v._k);
					delete(v._tag);
					delete(v._id);
					delete(v._mod);

					if(!ret[tag])
						ret[tag] = {};

					ret[tag][key] = this;
				});

				ret = ret.ksort();

				cb(ret);
			});
		},
		load: function(tag, code, cb){
			const fields = {_id: false, _k: true};

			fields[code] = true;

			return this.find({_tag: tag}, fields).then(cb);
		},
		getMlTag: function(tag, cb){
			if(typeof tag === 'string')
				return this.getMlTag_(tag, cb);

			const ret = {};
			let count = 0;

			tag.forEach(function(t){
				this.getMlTag_(t, function(err, r){
					merge(ret, r);

					if(++count === tag.length)
						cb(err, ret);
				});
			}, this);
		},
		getMlTag_: function(tag, cb){
			this.find({_tag: tag}, exclude, function(err, r){
				if(err)
					return cb(err);

				const ret = {};

				r.forEach(function(obj){
					ret[obj._k] = obj.toObject();

					delete ret[obj._k]._k;
				});

				cb(null, ret);
			});
		},
		check: function(cb){
			const dbname = this.db.name;

			this.count(function(err, count){
				if(err || count > 5) return cb && cb(err, count);

				console.log('Inserting lang collection default values');

				exec('mongorestore -d ' + dbname + ' -c lang ' + site.lipthusDir + '/configs/lang.bson', function(err, stdout, stderr){
					cb && cb(err || stderr && new Error(stderr), stdout);

					console.log(stdout, stderr);
				});
			});
		}
	};

	return s;
};
