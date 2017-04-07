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
	
	//noinspection JSUnusedGlobalSymbols
	s.statics = {
		get: function(key){
			return this.findOne({key: key});
		},
		set: function(key, value, expire){
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
					if(doc && doc.expire.getTime() > Date.now())
						return doc;

					return getter()
						.then(obj => this.set(key, obj.value, obj.expire));
			});
		}
	};
	
	return s;
};