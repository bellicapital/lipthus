export class LipthusLocation {
	// noinspection JSMismatchedCollectionQueryUpdate
	private readonly address_components: any[];
	private address: any;

	constructor(opt) {
		if (!opt)
			opt = {};

		Object.assign(this, opt);

		if (!opt.address_components)
			this.address_components = opt.address_components = [];
		else
			opt.address_components.forEach((ac, i) => {
				this.address_components[i] = new AddressComponent(ac);
			});
	}

	addressComponent(type) {
		let ret = null;

		this.address_components.some(c => {
			if (c.isType(type)) {
				ret = {
					short_name: c.short_name,
					long_name: c.long_name
				};

				return true;
			}
		});

		return ret;
	}

	addressComponentLong(type): string {
		const ac = this.addressComponent(type);

		return ac ? ac.long_name : '';
	}

	toString(sep) {
		if (this.address)
			return this.address;

		const ret = [];
		const city = this.addressComponentLong('locality');
		const prov = this.addressComponentLong('administrative_area_level_2');

		if (this.addressComponentLong('locality'))
			ret.push(city);

		if (prov)
			ret.push(prov);

		if (!ret.length) {
			const country = this.addressComponentLong('country');

			if (country)
				ret.push(country);
		}

		return ret.join(sep || ' · ') || '';
	}
}

class AddressComponent {
	private types: any;
	// @ts-ignore
	private short_name: any;
	// @ts-ignore
	private long_name: any;

	constructor(opt) {
		this.types = opt.type || opt.types;
		this.short_name = opt.short_name;
		this.long_name = opt.long_name;
	}

	isType(type) {
		return this.types.indexOf(type) !== -1;
	}
}
