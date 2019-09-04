"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
class ShopItemExtra {
    constructor(d) {
        this.key = d.key;
        this.value = d.value;
        if (typeof d.price === 'string')
            d.price = d.price.replace(',', '');
        this.price = parseInt(d.price, 10) || 0;
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
exports.ShopItemExtra = ShopItemExtra;
ShopItemExtra.schema = new lib_1.LipthusSchema({
    key: String,
    value: String,
    price: Number
}, {
    name: 'ShopItemExtra'
    // _id: false
});
/**
 * Used in payment
 * @param {object} d
 * @returns {ShopItem}
 */
class ShopItem {
    constructor(d) {
        this.quantity = 1;
        this.extras = [];
        this.description = {};
        if (d.constructor.name === 'EmbeddedDocument')
            d = d._doc;
        Object.assign(this, d);
        this.price = parseInt(d.price, 10) || 0;
        this.ref = lib_1.DBRef.cast(d.ref);
        this.extras = d.extras.map((extra) => new ShopItemExtra(extra));
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
        if (this.extras)
            ret.extras = this.extras.map((extra) => extra.getInfo(req, formatted));
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
        const byKey = {};
        item.extras.forEach((xt) => byKey[xt.key] = xt);
        return !this.extras.some((xt) => (byKey[xt.key].value !== xt.value || byKey[xt.key].price !== xt.price));
    }
    data4save() {
        if (!(this.ref instanceof lib_1.DBRef))
            this.ref = lib_1.DBRef.fromObject(this.ref);
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
exports.ShopItem = ShopItem;
ShopItem.schema = new lib_1.LipthusSchema({
    quantity: { type: Number, default: 1 },
    description: {},
    ref: { type: lib_1.DBRef.schema },
    price: Number,
    extras: [ShopItemExtra.schema]
}, {
    name: 'ShopItem'
    // _id: false
});
