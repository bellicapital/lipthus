import {Site} from "../modules";

export function update(site: Site) {
	const model = site.db.config;
	
	return model.findOne({name: 'pay'})
		.then(() => {
		
		})
		.then(() => ({ok: true}));
}
