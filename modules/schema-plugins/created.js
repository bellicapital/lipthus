"use strict";

const noop = () => {};

const ensureCreated = doc => {
	if(!doc.created && doc._id && doc.isSelected('created'))
		doc.created = doc._id.getTimestamp();
};

module.exports = function createdPlugin (schema, options) {
	schema.add({ created: {type: Date, index: true}});

	schema.post('init', ensureCreated);

	schema.pre('save', function (next) {
		ensureCreated(this);

		next();
	});

	if(options && options.index)
		schema.path('created').index(options.index);


	//Asegura que está creado.
	//Para objetos dinámicos a los que se le ha añadido el plugin cuando ya existen objetos creados

	if (!schema.options.toJSON)
		schema.options.toJSON = {};

	const _transform = schema.options.toJSON.transform || noop;

	schema.options.toJSON.transform = (doc, ret, options) => {
		_transform(doc, ret, options);

		if(!ret.created && doc._id)
			ret.created = doc._id.getTimestamp();
	};
};