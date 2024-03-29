"use strict";
const { BinDataImage } = require('../../modules');
module.exports = {
    updateItem(req) {
        const ObjectId = req.db.mongoose.Types.ObjectId;
        let { colname, id, key, value } = req.body; //l(colname, id, key, value)
        id = ObjectId(id);
        const model = req.db[colname];
        const params = {};
        params[key] = value;
        const field = key.split('.')[0];
        let native = false;
        switch (model.schema.getTypename(field)) {
            case 'BdfList':
                return setImage(model, id, key, value);
            case 'MlCheckboxes':
            case 'MlSelector':
                native = true;
        }
        return doUpdate(model, id, { $set: params }, native);
    },
    removeItemField(req) {
        let { colname, id, key } = req.body; //l(colname, id, key, value)
        const unset = {};
        unset[key] = 1;
        return doUpdate(req.db[colname], id, { $unset: unset });
    },
    sortItemFiles(req) {
        const ObjectId = req.db.mongoose.Types.ObjectId;
        let { colname, id, key, weights } = req.body;
        id = ObjectId(id);
        const update = {};
        let i = 0;
        weights.forEach(w => update[key + '.' + w + '.weight'] = i++);
        return doUpdate(req.db[colname], id, { $set: update }, true);
    },
    getItem: req => {
        return req.db[req.body.colname].findById(req.body.id)
            .then(item => item);
    }
};
const setImage = (model, id, key, img) => {
    return BinDataImage.fromFrontEnd(img, {
        collection: "dynobjects.escorts",
        id: id,
        field: key
    })
        .then(bdi => {
        const update = {};
        update[key] = bdi;
        return doUpdate(model, id, { $set: update }, key);
    });
};
const doUpdate = (model, id, params, native) => {
    // solución temporal. Evita un bug en lipthus para los MlCheckboxes y MlSelector con update
    const func = native ? 'updateNative' : 'update';
    return model[func]({ _id: id }, params)
        .then(r => {
        r = r.result || r;
        if (r.nModified !== 1)
            return false;
        return { ok: true };
    });
};
