"use strict";

const definitions = require('../configs/configs');
const groupsByKey = {};
const {BinDataFile} = require('../modules');

Object.each(definitions, (group, d) => {
	Object.each(d.configs, key => groupsByKey[key] = group);
});

function getDefinition(key){
	if(!definitions[groupsByKey[key]]) {
		console.warn('Config ' + key + ' not defined');
		return [];
	}

	return definitions[groupsByKey[key]].configs[key];
}


module.exports = function config(Schema){
	const s = new Schema({
		name: {type: String, unique: true},
		value: {type: Schema.Types.Mixed, get: function(val){
			if(this.name &&  getDefinition(this.name)[0] === 'bdf')
				return BinDataFile.fromMongo(val, {collection: 'config', id: this._id, field: 'value'});

			return val;
		}}
	}, {collection: 'config'});

	/**
	 * @param name
	 * @param value
	 * @returns {Promise|Promise.<{}>|*}
	 */
	s.statics.changeValue = function(name, value){
		return this.update({name: name}, {$set: {value: value}})
			.then(() => this.db.eucaDb.site.config[name] = value);
	};

	/**
	 * @deprecated
	 * @param name
	 * @param sub
	 * @param value
	 */
	s.statics.changeSubValue = function(name, sub, value){
		const update = {};
		update['value.' + sub] = value;

		return this.update({name: name}, {$set: update});
	};

	return s;
};
