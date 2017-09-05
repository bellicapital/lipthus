"use strict";

const Bdi = require('../../modules/bdi');

const methods = module.exports = {
	updateItem(req) {
		const ObjectId = req.db.mongoose.Types.ObjectId;
		let {colname, id, key, value} = req.body;//l(colname, id, key, value)
		id = ObjectId(id);
		const model = req.db[colname];
		const params = {};
		params[key] = value;
		const field = key.split('.')[0];
		let native = false;

		switch(model.schema.getTypename(field)){
			case 'BdfList':
				return methods.setImage(model, id, key, value);
				break;
			case 'MlCheckboxes':
			case 'MlSelector':
				native = true;
		}

		return methods._doUpdate(model, id, {$set: params}, native);
	},

	setImage(model, id, key, img){
		return Bdi.fromFrontEnd(img, {
			collection: "dynobjects.escorts",
			id: id,
			field: key
		})
			.then(bdi => {
				const update = {};
				update[key] = bdi;

				return methods._doUpdate(model, id, {$set: update}, key);
			});
	},

	_doUpdate(model, id, params, native){
		// solución temporal. Evita un bug en lipthus para los MlCheckboxes y MlSelector con update
		const func = native	? 'updateNative' : 'update';

		return model[func]({_id: id}, params)
			.then(r => {
				r = r.result || r;

				if (r.nModified !== 1)
					return false;

				return {ok: true};
			});
	},

	removeItemField(req){
		let {colname, id, key} = req.body;//l(colname, id, key, value)
		const unset = {};
		unset[key] = 1;

		return methods._doUpdate(req.db[colname], id, {$unset: unset});
	}
};