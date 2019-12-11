"use strict";
const { ShopItem } = require('../modules/shopping/shop-item');
const { DBRef } = require('../lib');
const Sermepa = require('sermepa');
const debug = require('debug')('site:payment');
debug.log = console.log.bind(console);
const statusNames = {
    approved: {
        es: 'Tarjeta aceptada',
        en: 'Credit card accepted'
    },
    denied: {
        es: 'Tarjeta denegada',
        en: 'Credit card denied'
    },
    waiting: {
        es: 'Esperando el pago',
        en: 'Waiting'
    },
    canceled: {
        es: 'Cancelado',
        en: 'Canceled'
    },
    ready: {
        es: 'Preparado',
        en: 'Ready'
    }
};
module.exports = function payment(Schema) {
    const s = new Schema({
        uid: { type: Schema.Types.ObjectId, ref: 'user' },
        number: Number,
        name: String,
        email: { type: String, formtype: 'email', required: true },
        phone: { type: String, formtype: 'tel', required: true },
        type: { type: String, options: ['shoppingcart', 'custom'] },
        send_address: { type: {}, formtype: 'location' },
        invoice_address: { type: {}, formtype: 'location' },
        status: { type: String, options: ['ready', 'waiting', 'denied', 'approved', 'canceled'] },
        deliveryStatus: {
            checked: Date,
            shipped: Date,
            delivered: Date
        },
        items: [ /*ShopItem.schema*/],
        deliveryAmount: Number,
        comments: { type: String, formtype: 'textarea' },
        currency: { type: Number, "default": 978 },
        paytype: { type: String, options: ['paypal', 'creditcard', 'cash'] },
        paytime: Date,
        tokenf: String,
        log: [],
        amount: Number,
        delegation: DBRef.schema,
        customdata: { type: {}, formtype: 'hidden' },
        merchant_order: { type: String, formtype: 'hidden' },
        merchant_code: { type: String, formtype: 'hidden' }
    }, {
        collection: 'payments',
        created: true,
        lastMod: true
    });
    s.post('init', function (doc) {
        doc.items && doc.items.forEach(function (item, i) {
            doc.items[i] = new ShopItem(item);
        });
    });
    s.pre('save', function (next) {
        if (this.number)
            return next();
        this.getNumber(function (err) {
            next(err);
        });
    });
    s.options.toJSON = {
        transform: function (doc, ret) {
            ret.created = doc._id.getTimestamp();
        }
    };
    s.virtual('signature').get(function () {
        return this.db.lipthusDb.site.config.pay.signature.trim();
    });
    s.virtual('merchantCode').get(function () {
        let merchantCode = this.get('merchant_code');
        if (!merchantCode) {
            merchantCode = this.db.lipthusDb.site.config.pay.merchantCode;
            this.set('merchant_code', merchantCode);
        }
        return merchantCode;
    });
    //noinspection JSUnusedGlobalSymbols,JSUnusedGlobalSymbols
    s.methods = {
        getInfo: function (req, formatted) {
            if (!req)
                return console.error(new Error('no req provided'));
            const ret = this.toJSON();
            if (formatted) {
                ret.amount = ret.amount.shopFormat();
                ret.deliveryAmount = ret.deliveryAmount.shopFormat();
            }
            delete ret.__v;
            this.items.forEach((item, idx) => ret.items[idx] = item.getInfo(req, formatted));
            return ret;
        },
        getNumber: function (cb) {
            this.db.lipthusDb.payment.findOne({}, '-_id number').sort({ number: -1 }).exec((err, r) => {
                if (err)
                    return cb && cb(err);
                this.set('number', ++r.number || 1);
                cb && cb(null, r.number);
            });
        },
        cardParams: function (cb) {
            if (this.status === 'approved')
                return cb();
            this.paytype = 'creditcard';
            this.merchantOrder(true, err => {
                if (err)
                    return cb(err);
                const site = this.db.lipthusDb.site;
                const url = site.mainUrl(null, true);
                const pay = site.config.pay;
                const pp = { url: pay.url_tpvv };
                const fields = {
                    Ds_Merchant_Amount: this.amount,
                    Ds_Merchant_Currency: this.currency,
                    Ds_Merchant_Order: this.merchant_order,
                    Ds_Merchant_MerchantCode: this.merchantCode,
                    Ds_Merchant_MerchantURL: pay.dsResponseUrl || url + '/dsresponse',
                    Ds_Merchant_UrlOK: url + pay.urlOK(this.id),
                    Ds_Merchant_UrlKO: url + pay.urlKO(this.id),
                    Ds_Merchant_Terminal: 1,
                    Ds_Merchant_TransactionType: 0,
                    Ds_Merchant_MerchantData: this.id
                };
                if (pay.merchantTitular)
                    fields.Ds_Merchant_Titular = pay.merchantTitular;
                //'Ds_Merchant_ProductDescription' => TODO
                if (pay.merchantName)
                    fields.Ds_Merchant_MerchantName = pay.merchantName;
                this.status = 'waiting';
                debug('pay fields', fields);
                const sermepa = new Sermepa(fields);
                this.log.push({
                    type: 'request',
                    date: new Date(),
                    paytype: this.paytype.value,
                    url: pp.url,
                    params: fields
                });
                const params = sermepa.createFormParameters(this.signature);
                this.save(err => cb(err, params, fields));
            });
        },
        merchantOrder: function (recreate, cb) {
            const mo = this.merchant_order;
            if (!recreate && mo)
                return mo;
            const num = Date.now().toFixed().substr(5);
            this.set('merchant_order', num);
            this.save(function (err) {
                if (err)
                    return cb(err);
                return cb(null, num);
            });
        },
        setCancel: function (cb) {
            this.set('status', 'canceled');
            this.save(cb);
        },
        statusName: function (lang) {
            const ret = statusNames[this.status];
            if (!ret)
                return this.status;
            return ret[lang] || ret[this.db.lipthusDb.site.config.language];
        }
    };
    return s;
};
