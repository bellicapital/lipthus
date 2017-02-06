"use strict";

const repair = item => item.set('created', new Date(item._id.getTimestamp())).save();

module.exports = function(site){
	const model = site.db.config;

	return model.findOne({name: 'pay'})
		.then(pay => pay && Object.map(pay.value, (k, v) => model.update({name: k}, {$set: {value: v}}, {upsert: true})))
		.then(p => p && Promise.all(p))
		.then(() => model.findOne({name: 'cart'}))
		.then(cart => cart && Object.map(cart.value, (k, v) => model.update({name: k}, {$set: {value: v}}, {upsert: true})))
		.then(p => p && Promise.all(p))
		.then(() => model.remove({
			$or: [
				{name: 'jqueryui_theme'},
				{name: 'reg_disclaimer'},
				{name: 'register_methods'},
				{name: 'reg_dispdsclmr'},
				{name: 'signature'},
				{name: 'adsense'},
				{name: 'urls'},
				{name: 'pay'},
				{name: 'cart'},
				{name: 'sms'}
			]
		}))
		.then(() => ({ok: true}));
};