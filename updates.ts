import {Site} from "./modules";

export const updates = (site: Site, version: string) => {

	switch (version) {
		case '1.6.1':
			return site.db.config
				.remove({name: {$in: ['protocol', 'external_protocol']}})
				.then(() => ({ok: true}));

		default:
			return Promise.resolve({ok: true});
	}
};
