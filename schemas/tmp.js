"use strict";

module.exports = function tmp(Schema){
	const s = new Schema({
		key: {type: String, index: true, unique: true},
		value: {},
		expire: Date
	}, {
		collection: 'tmp',
		modified: true
	});
	
	s.methods = {
		expired: function(){
			return this.expire && this.expire.getTime() < Date.now();
		},
		getValue: function(){
			return JSON.parse(this.value);
		},
	};
	
	s.statics = {
		get: function(key, cb){
			if(cb)
				console.trace('db.tmp.get cb deprecated');

			return this.findOne({key: key}, cb);
		},
		set: function(key, value, expire, cb){
			if(typeof expire === 'function'){
				cb = expire;
				expire = null;
			}

			if(typeof cb === 'function')
				console.trace('db.tmp.set cb deprecated');
			
			const update = {
				value: value,
				modified: new Date()
			};
			
			if(expire)
				update.expire = expire;

			return this.findOneAndUpdate({key: key}, update, {upsert: true})
				.then(r => r || this(update));
		},
		getSet: function(key, getter){
			return this.get(key)
				.then(doc => {
					if(doc)
						return doc;
				
					return getter()
						.then(obj => this.set(key, obj.value, obj.expire));
			});
		}
	};
	
	return s;
};