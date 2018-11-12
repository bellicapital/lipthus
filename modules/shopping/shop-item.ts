import {LipthusSchema, DBRef} from "../../lib";
import {LipthusRequest} from "../../index";
import {KeyString} from "../../interfaces/global.interface";


export class ShopItemExtra {

	public key: string;
	public value: any;
	public price: number;

	static schema = new LipthusSchema({
		key: String,
		value: String,
		price: Number
	}, {
		name: 'ShopItemExtra'
		// _id: false
	});

	constructor(d: any) {
		this.key = d.key;
		this.value = d.value;

		if (typeof d.price === 'string')
			d.price = d.price.replace(',', '');

		this.price = parseInt(d.price, 10) || 0;

		// if (d.constructor.name === 'EmbeddedDocument')
		// 	d = d._doc;
	}

	getInfo(req: LipthusRequest, formatted: boolean) {
		return {
			key: this.key,
			value: this.value,
			description: req ? req.ml.get(this.value) : this.value,
			price: this.price && (formatted ? this.price.shopFormat() : this.price)
		};
	}

	data4save() {
		return {
			key: this.key,
			value: this.value,
			price: this.price
		};
	}
}

/**
 * Used in payment
 * @param {object} d
 * @returns {ShopItem}
 */
export class ShopItem {

	public quantity = 1;
	public price: number;
	public ref: any;
	public extras: Array<any> = [];
	public description: KeyString = {};

	static schema = new LipthusSchema({
		quantity: {type: Number, default: 1},
		description: {},
		ref: {type: DBRef.schema},
		price: Number,
		extras: [ShopItemExtra.schema]
	}, {
		name: 'ShopItem'
		// _id: false
	});

	constructor(d: any) {
		if (d.constructor.name === 'EmbeddedDocument')
			d = d._doc;

		Object.assign(this, d);

		this.price = parseInt(d.price, 10) || 0;
		this.ref = DBRef.cast(d.ref);
		this.extras = d.extras.map((extra: any) => new ShopItemExtra(extra));
	}

	getInfo(req: LipthusRequest, formatted: boolean) {
		const price = this.getPrice();
		const lang = req.ml.lang;
		const defaultLang = (req.ml.constructor as any).defaultLang;

		const ret: any = {
			quantity: this.quantity,
			description: this.description[lang] || this.description[defaultLang],
			price: price,
			total: this.quantity * price
		};

		if (formatted) {
			ret.price = ret.price.shopFormat();
			ret.total = ret.total.shopFormat();
		}

		if (this.ref) {
			ret.colname = this.ref.namespace.replace('dynobjects.', '');
			ret.itemid = this.ref.oid;
		}

		if (this.extras)
			ret.extras = this.extras.map((extra: any) => extra.getInfo(req, formatted));

		return ret;
	}

	getPrice() {
		let price = this.price;

		if (this.extras) {
			Object.values(this.extras).forEach(extra => {
				if (extra.price)
					price += extra.price;
			});
		}

		return price;
	}

	getTotal() {
		return this.quantity * this.getPrice();
	}

	/**
	 * Compara el producto con el de otro item
	 * @param {ShopItem} item
	 * @returns {Boolean}
	 */
	equals(item: any) {
		return this.ref.equals(item.ref) && this.compareExtras(item);
	}

	/**
	 * Compara extras con otro item
	 * @param {ShopItem} item
	 * @returns {Boolean}
	 */
	compareExtras(item: any) {
		if (!(this.extras && this.extras.length) && !(item.extras && item.extras.length))
			return true;

		if (this.extras.length !== item.extras.length)
			return false;

		const byKey: any = {};

		item.extras.forEach((xt: any) => byKey[xt.key] = xt);

		return !this.extras.some((xt: any) => (byKey[xt.key].value !== xt.value || byKey[xt.key].price !== xt.price));
	}

	data4save() {
		if (!(this.ref instanceof DBRef))
			this.ref = DBRef.fromObject(this.ref);

		const ret: any = {
			quantity: this.quantity,
			description: this.description,
			price: this.price,
			ref: this.ref
		};

		if (this.extras && this.extras.length) {
			ret.extras = [];

			this.extras.forEach(function (extra) {
				ret.extras.push(extra.data4save());
			});
		}

		return ret;
	}
}
