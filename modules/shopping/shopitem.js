"use strict";

const {LipthusSchema, DBRef} = require("../../lib");

/**
 * Used in payment
 * @param {object} d
 * @returns {ShopItem}
 */
class ShopItem {
	constructor(d) {
		this.quantity = 1;

		if (d.constructor.name === 'EmbeddedDocument')
			d = d._doc;

		Object.assign(this, d);

		this.price = parseInt(this.price) || 0;

		this.ref = DBRef.cast(d.ref);

		this.extras = [];

		if(d.extras && d.extras.forEach)
			d.extras.forEach(extra => this.extras.push(new ShopItemExtra(extra)));
	}

	getInfo(req, formatted) {
		const price = this.getPrice();
		const lang = req.ml.lang;
		const defaultLang = req.ml.constructor.defaultLang;

		const ret = {
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

		if (this.extras) {
			ret.extras = [];

			this.extras.forEach(function (extra) {
				ret.extras.push(extra.getInfo(req, formatted));
			});
		}

		return ret;
	}

	getPrice() {
		let price = this.price;

		this.extras && Object.values(this.extras).forEach(extra => {
			if (extra.price)
				price += extra.price;
		});

		return price;
	}

	getTotal() {
		return this.quantity * this.getPrice(false);
	}

	/**
	 * Compara el producto con el de otro item
	 * @param {ShopItem} item
	 * @returns {Boolean}
	 */
	equals(item) {
		return this.ref.equals(item.ref) && this.compareExtras(item);
	}

	/**
	 * Compara extras con otro item
	 * @param {ShopItem} item
	 * @returns {Boolean}
	 */
	compareExtras(item) {
		if (!(this.extras && this.extras.length) && !(item.extras && item.extras.length))
			return true;

		if (this.extras.length !== item.extras.length)
			return false;

		const bykey = {};

		item.extras.forEach(function (xt) {
			bykey[xt.key] = xt;
		});

		return !this.extras.some(function (xt) {
			if (bykey[xt.key].value !== xt.value || bykey[xt.key].price !== xt.price)
				return true;
		});
	}

	data4save() {
		if (!(this.ref instanceof DBRef))
			this.ref = DBRef.fromObject(this.ref);

		const ret = {
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

class ShopItemExtra {
	constructor(d) {
		this.key = d.key;
		this.value = d.value;

		if (typeof d.price === 'string')
			d.price = d.price.replace(',', '');

		this.price = parseInt(d.price) || 0;

		// if (d.constructor.name === 'EmbeddedDocument')
		// 	d = d._doc;
	}

	getInfo(req, formatted) {
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

ShopItemExtra.schema = new LipthusSchema({
	key: String,
	value: String,
	price: Number
}, {
	name: 'ShopItemExtra'
//	_id: false
});

ShopItem.schema = new LipthusSchema({
	quantity: {type: Number, default: 1},
	description: {},
	ref: {type: DBRef.schema},
	price: Number,
	extras: [ShopItemExtra.schema]
}, {
	name: 'ShopItem'
//	_id: false
});

module.exports = ShopItem;
