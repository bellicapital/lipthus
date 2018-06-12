import {LipthusRequest, LipthusResponse} from '../../index';

const ShopItem = require('./shopitem');
const ShoppingCartPreferences = require('./shoppingcartpreferences');
const ShopPayParams = require('./shoppayparams');
const EucaLocation = require('../geo/location');
const DBRef = require('../../lib/dbref');


class ShoppingCart {
	
	public items: Array<any> = [];
	public currency = 'EUR';
	
	/**
	 * Should to be delivered
	 * @type boolean
	 */
	public deliver?: any;
	public deliveryAddress?: any;
	public deliveryAmount = 0;
	public name?: string;
	public phone?: Array<string> | string;
	public email?: string;
	public comment = '';
	public itemsTotal = 0;
	public total = 0;
	public modified?: Date;
	public preferences: any;
	public payParams?: any;
	public mlLoaded = false;
	
	/**
	 * Delegación, sucursal, franquicia...
	 * @type object DbRef
	 */
	public delegation: any;
	public customdata?: any;
	public paymentMethod?: string;
	
	public user: any;
	
	public static schema = {
		currency: {type: String, default: 'EUR'},
		
		/**
		 * Should to be delivered
		 * @type boolean
		 */
		deliver: Boolean,
		deliveryAddress: String,
		deliveryAmount: {type: Number, default: 0},
		name: String,
		phone: String,
		email: String,
		comment: String,
		itemsTotal: Number,
		total: Number,
		modified: Date,
		items: [ShopItem.schema],
		
		/**
		 * Delegación, sucursal, franquicia...
		 * @type object DbRef
		 */
		delegation: {type: DBRef.schema, default: null},
		paymentMethod: String,
		customdata: {}
	};
	
	constructor(public req: LipthusRequest) {
		
		Object.defineProperties(this, {
			req: {value: req},
			user: {value: req.user}
		});
		
		this.getPayParams();
		this.getPreferences();
		
		let obj: ShoppingCart | any = req.user ? req.user.cart : req.session.cart;
		
		if (obj) {
			if (obj.constructor.name === 'EmbeddedDocument')
				obj = obj._doc;
			else if (obj.constructor.name === 'model')
				obj = obj.toObject();
			
			Object.keys(obj).forEach(k => {
				if (k !== 'items')
					(this as any)[k] = obj[k];
			});
			
			if (obj.items)
				obj.items = obj.items.map((item: any) => new ShopItem(item));
			
			if (obj.modified && !(obj.modified instanceof Date))
				this.modified = new Date(obj.modified);
		}
		
		this.setTotal();
		this.setName();
		this.setPhone();
		this.setEmail();
		this.setAddress();
	}
	
	setName() {
		if (!this.name && this.user)
			this.name = this.user.getName(true);
	}
	
	setEmail() {
		if (!this.email && this.req.user)
			this.email = this.req.user.email;
	}
	
	setPhone() {
		if (!this.phone && this.req.user && this.req.user.phone)
			this.phone = this.req.user.phone;
	}
	
	setAddress(address?: any) {
		if (address) {
			this.deliveryAddress = new EucaLocation(address);
		} else if (!this.deliveryAddress && this.req.user) {
			this.deliveryAddress = this.req.user.address;
		}
		
		if (this.deliveryAddress && !(this.deliveryAddress instanceof EucaLocation))
			this.deliveryAddress = new EucaLocation(this.deliveryAddress);
	}
	
	getIcon() {
		let ret = '<a href="#" class="shoppingCartIcon ui-widget ui-widget-content ui-corner-all';
		
		ret += '">'
			+ '<span class="ui-icon ui-icon-cart" style="float:left"></span>'
			+ '<span style="float:left;font-size:12px">' + this.items.length + '</span>'
			+ '<span style="clear:both">'
			+ '</a>';
		
		return ret;
	}
	
	itemsInfo() {
		const items = <any>[];
		const req = this.req;
		
		this.items.forEach((item: any) => items.push(item.getInfo(req, true)));
		
		return items;
	}
	
	getInfo() {
		return this.loadML()
			.then((lc: any) => ({
				lang: {
					title: lc._SHOPPING_CART,
					empty: lc._SHOPPING_CART_EMPTY,
					quantity: lc._QUANTITY,
					"delete": lc._DELETE,
					price: lc._PRICE,
					total: lc._TOTAL,
					pay: lc._PAY,
					testMsg: lc._PAY_TESTMODE,
					pendingOrders: lc._ORD_THERE_ORDERS,
					fetching: lc._FETCHING
				},
				deliver: this.deliver,
				deliveryMinAmount: this.preferences.deliveryMinAmount,
				deliveryMinAmountNoCharge: this.preferences.deliveryMinAmountNoCharge,
				deliveryAddress: this.deliveryAddress,
				deliveryAddressRestrictions: this.preferences.deliveryAddressRestrictions,
				phone: this.phone,
				currency: this.currency,
				items: this.itemsInfo(),
				deliveryAmount: this.deliveryAmount ? this.deliveryAmount.shopFormat() : 0,
				comment: this.comment,
				itemsTotal: this.itemsTotal.shopFormat(),
				total: this.total.shopFormat(),
				testMode: this.payParams.pay_test,
				errors: this.check()
			}));
	}
	
	check() {
		const errors = [];
		
		if (this.deliver) {
			if (this.preferences.deliveryMinAmount && this.preferences.deliveryMinAmount.m100() > this.total)
				errors.push('min amount to deliver not reached');
			
			const d_address = this.checkAddress(this.deliveryAddress);
			
			if (d_address !== 'ok')
				errors.push('Delivery address: ' + d_address);
		}
		
		return errors;
	}
	
	checkAddress(address: any) {
		if (!address)
			return 'no address';
		
		if (!address.types)
			return 'just string address';
		
		if (!address.types.some((type: string) => type === 'street_address'))
			return 'not a street address';
		
		if (this.preferences.deliveryAddressRestrictions) {
			const ar = this.preferences.deliveryAddressRestrictions;
			
			Object.each(ar, (k, v) => {
				if (v.indexOf(address.addressComponent(k).short_name) === -1)
					return 'not allowed ' + k;
			});
		}
		
		return 'ok';
	}
	
	getShopItem(colname: string, itemid: string, extras?: any) {
		return this.req.db[colname]
			.findById(itemid)
			.select('title price sell_price')
			.then((product: any) => {
				const price = (product.get('sell_price') || product.get('price') || 0).m100();
				
				const item = new ShopItem({
					description: product.get('title'),
					ref: product.getDBRef(),
					price: price,
					extras: extras
				});
				
				let ret = null;
				let idx = null;
				
				this.items.some((it: any, k: number) => {
					if (it.equals(item)) {
						ret = it;
						idx = k;
						
						return true;
					}
					
					return false;
				});
				
				return {item: ret, idx: idx, upserted: item};
			});
	}
	
	add(colname: string, itemid: string, extras: any) {
		return this.getShopItem(colname, itemid, extras)
			.then((r: any) => {
				if (r.item)
					r.item.quantity++;
				else
					this.items.push(r.upserted);
				
				this.setTotal();
			})
			.then(this.saveToClient.bind(this));
	}
	
	setTotal() {
		this.itemsTotal = 0;
		
		this.items.forEach(item => this.itemsTotal += item.getTotal());
		
		const p = this.preferences;
		
		if (this.deliver && p.deliveryCharge && (!p.deliveryMinAmountNoCharge || p.deliveryMinAmountNoCharge > this.itemsTotal / 100))
			this.deliveryAmount = p.deliveryCharge.m100();
		else
			this.deliveryAmount = 0;
		
		this.total = this.itemsTotal + this.deliveryAmount;
	}
	
	saveToClient() {
		this.modified = new Date();
		
		const obj = this.data4save();
		const user = this.req.user;
		
		if (user) {
			user.set('cart', obj);
			
			return user.save();
		} else
			this.req.session.cart = obj;
	}
	
	data4save() {
		const data: any = {
			items: <any> this.items.map(item => item.data4save())
		};
		
		Object.keys(this).forEach(k => data[k] = (this as any)[k]);
		
		return data;
	}
	
	destroy() {
		const req = this.req;
		
		this.items = [];
		
		if (req.user) {
			req.user.cart = undefined;
			req.user.save().catch(console.error.bind(console));
		} else
			delete req.session.cart;
	}
	
	loadML() {
		if (this.mlLoaded)
			return Promise.resolve(this.req.ml.all);
		
		return this.req.ml
			.load(['ecms-shopping', 'shopping', 'ecms-location'])
			.then((all: any) => {
				this.mlLoaded = true;
				
				return all;
			});
	}
	
	set(name: string, value: any) {
		if (name === 'deliveryAddress')
			this.setAddress(value);
		else {
			(this as any)[name] = value;
			this.setTotal();
		}
	}
	
	createPayment(): any {
		return this.req.db.payment.create({
			type: 'shoppingcart',
			paytype: this.paymentMethod,
			items: this.items,
			send_address: this.deliveryAddress,
			name: this.name,
			email: this.email,
			comments: this.comment,
			status: 'ready',
			deliveryAmount: this.deliveryAmount,
			amount: this.total,
			phone: this.phone,
			delegation: this.delegation.toObject(),
			customdata: this.customdata
		});
	}
	
	getPayParams() {
		const req = this.req;
		
		if (!this.payParams)
			this.payParams = req.app.get('pay_params');
		
		if (this.payParams)
			return this.payParams;
		
		this.payParams = new ShopPayParams(req.site.config.getValuesByCat('pay'));
		
		req.app.set('pay_params', this.payParams);
		
		return this.payParams;
	}
	
	getPreferences() {
		const req = this.req;
		
		if (!this.preferences)
			this.preferences = req.app.get('shoppingcart_preferences');
		
		if (this.preferences)
			return this.preferences;
		
		this.preferences = new ShoppingCartPreferences(req.site.config.getValuesByCat('cart'));
		
		req.app.set('shoppingcart_preferences', this.preferences);
		
		return this.preferences;
	}
	
	process() {
		return this.createPayment()
			.then((payment: any) => {
				return new Promise((ok, ko) => {
					const info = payment.getInfo(this.req);
					
					const finish = () => {
						this.destroy();
						
						ok({
							info: info,
							payment: payment
						});
					};
					
					switch (payment.paytype) {
						case 'paypal':
							info.paypalParams = payment.paypalParams();
							
							finish();
							break;
						
						case 'creditcard':
							payment.cardParams((err: Error, params: any) => {
								if (err)
									return ko(err);
								
								info.cardParams = params;
								
								info.tpvUrl = this.req.site.config.pay.url();
								
								finish();
							});
							break;
						
						default:
							finish();
					}
				});
			});
	}
	
	itemsCount() {
		let ret = 0;
		
		this.items.forEach(item => ret += item.quantity);
		
		return ret;
	}
	
	changeItemQuantity(colname: string, itemid: string, quantity: number | string, extras: any) {
		let itemTotal = 0;
		
		return this.getShopItem(colname, itemid, extras)
			.then((r: any) => {
				if (!r.item)
					throw new Error('Item not found');
				
				if (typeof quantity === 'string')
					quantity = parseInt(quantity, 10);
				
				if (quantity) {
					r.item.quantity = quantity;
					itemTotal = r.item.getTotal();
				} else
					this.items.splice(r.idx, 1);
				
				this.setTotal();
			})
			.then(this.saveToClient.bind(this))
			.then(() => ({
				itemTotal: itemTotal.shopFormat(),
				cartTotal: this.total.shopFormat(),
				deliveryAmount: this.deliveryAmount ? this.deliveryAmount.shopFormat() : 0,
				errors: this.check()
			}));
	}
	
	static set(req: LipthusRequest, res: LipthusResponse, name: string, value: any) {
		const cart = ShoppingCart.getClientCart(req);
		
		cart.set(name, value);
		
		if (req.user && name === 'phone' && value && req.user.phone.indexOf(value) === -1)
			req.user.phone.push(value);
		
		return cart.saveToClient()
			.then(cart.getInfo.bind(cart));
	}
	
	static getClientCart(req: any) {
		if (req.clientCart)
			return req.clientCart;
		
		const cart = new ShoppingCart(req);
		
		if (cart.preferences.expire && cart.modified && cart.modified.getTime() < Date.now() - cart.preferences.expire * 60000)
			cart.destroy();
		else if (!cart.deliveryAddress && req.user && req.user.address)
			cart.deliveryAddress = req.user.address;
		
		return (req.clientCart = cart);
	}
	
	static load(req: LipthusRequest, res: LipthusResponse) {
		const page = res.htmlPage;
		
		// page.formScripts()
		page.head
			.addGMap()
			.addJS('form/formLocation.js')
			.addCSS('form', 20)
			.addJS('shoppingcart.js')
			.addCSS('shoppingcart', 18);
		
		const cart = ShoppingCart.getClientCart(req);
		
		return cart.loadML()
			.then((ml: any) => {
				page.addJSLang({
					_SUB_ADDRESS: ml._SUB_ADDRESS
				});
				
				res.locals.carticon = cart.getIcon();
				
				return cart;
			});
	}
	
	static getJsonInfo(req: LipthusRequest, res: LipthusResponse) {
		return ShoppingCart.load(req, res)
			.then((cart: ShoppingCart) => cart.getInfo());
	}
	
	static addItem(req: LipthusRequest, res: LipthusResponse, colname: string, itemid: string, extras: any) {
		const cart = ShoppingCart.getClientCart(req);
		
		return cart.add(colname, itemid, extras)
			.then(() => cart.getInfo());
	}
	
	static changeQuantity(req: LipthusRequest, res: LipthusResponse, colname: string, itemid: string, quantity: number, extras: any) {
		return ShoppingCart.getClientCart(req).changeItemQuantity(colname, itemid, quantity, extras);
	}
}

module.exports = ShoppingCart;

Number.prototype.shopFormat = function () {
	const n = this as number / 100;
	
	return n.toFixed(2).replace('.', ',').replace(/\d(?=(\d{3})+\.)/g, '$&,');
};
Number.prototype.m100 = function () {
	return Math.round(this as number * 100);
};
