"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ensureCreated = (doc) => {
    if (!doc.created && doc._id && doc._id.getTimestamp && doc.isSelected('created'))
        doc.created = doc._id.getTimestamp();
};
function createdPlugin(schema, options) {
    schema.add({ created: Date });
    schema.index({ created: 1 });
    schema.post('init', ensureCreated);
    schema.pre('save', function (next) {
        ensureCreated(this);
        next();
    });
    if (options && options.index)
        schema.path('created').index(options.index);
    // Asegura que está creado.
    // Para objetos dinámicos a los que se le ha añadido el plugin cuando ya existen objetos creados
    if (!schema.options.toJSON)
        schema.options.toJSON = {};
    const _transform = schema.options.toJSON.transform || (() => { });
    schema.options.toJSON.transform = (doc, ret, options2) => {
        _transform(doc, ret, options2);
        if (!ret.created && doc._id && doc.isSelected('created'))
            ret.created = doc._id.getTimestamp();
    };
}
exports.createdPlugin = createdPlugin;
