"use strict";

class ReqModel {
	constructor(model, req) {
		Object.defineProperties(this, {
			model: {value: model},
			req: {value: req}
		});

		Object.keys(this.model.schema.statics).forEach(k => {
			// aún sin => porque rest_parameters está en stage
			// https://nodejs.org/en/docs/es6/#which-features-are-behind-the-es_staging-flag
			this[k] = function () {
				return model[k].apply(model, arguments);
			}
		});
	}

	toString() {
		return this.model.modelName;
	}

	get collection() {
		return this.model.collection;
	}

	get schema() {
		return this.model.schema;
	}

	get db() {
		return this.model.db;
	}

	get modelName() {
		return this.model.modelName;
	}

	findOne() {
		return new Promise((resolve, reject) => {
			this.model[k](...arguments, (err, r) => {
				if (err) return reject(err);

				if (r)
					Object.defineProperty(r, 'req', {value: this._req});

				resolve(r);
			});
		});
	}

	find() {
		return new Promise((resolve, reject) => {
			this.model[k](...arguments, (err, r) => {
				if (err) return reject(err);

				if (r)
					r.forEach(d => {
						Object.defineProperty(d, 'req', {value: this._req});
					});


				resolve(r);
			});
		});
	}
}

const methods = [
	'aggregate',
	'create',
	'count',
	'distinct',
	'ensureIndexes',
	'find',
	'findOne',
	'findById',
	'findByIdAndRemove',
	'findOneAndUpdate',
	'findOneAndRemove',
	'geoNear',
	'geoSearch',
	'insertMany',
	'mapReduce',
	'populate',
	'remove',
	'update'
];

methods.forEach(function (k) {
	ReqModel.prototype[k] = function () {
		return this.model[k](...arguments);
	};
});

const noCbMethods = [
	'hydrate',
	'where'
];

noCbMethods.forEach(k => {
	ReqModel.prototype[k] = () => this.model[k](...arguments);
});


module.exports = ReqModel;