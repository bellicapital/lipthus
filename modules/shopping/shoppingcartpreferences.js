"use strict";

class ShoppingCartPreferences {
	constructor(opt){
		this.deliveryCharge = 0;
		this.deliveryAddressComponents = [];
		this.deliveryAddressRestrictions = [];
		this.expire = 120;//minutes
		this.deliveryMinAmount = null;
		this.deliveryMinAmountNoCharge = null;

		if(opt)
			Object.extend(this, opt);
	}
}

module.exports = ShoppingCartPreferences;