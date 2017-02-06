"use strict";

const md5 = require('md5');
const ShoppingCart = require('../modules/shopping/shoppingcart');

module.exports = function user(Schema){
	const s = new Schema({
		uname: {type: String, size: 20, maxlength: 25, index: {unique: true}},
        name: String,
		given_name: String,
		family_name: String,
        alias: String,
        email: {type: String, formtype: 'email', required: true, index: {unique: true}},
		email_verified: Boolean,
        url: {type: String, formtype: 'url'},
		picture: String, // auth0 picture
		picture_large: String, // auth0 picture_large
        image: {type: String, formtype: 'image'},
        location: {type: {}, formtype: 'location'},
        actkey: String,
		gender: String,
		birthday: String,
        pass: {type: String, maxlength:  32},
        level: {type: Number, formtype: 'int', default: 0},
        type: String,// tipo de usuario especial (videouploader, translator, blogger, ...)
        timezone_offset: {type: Number, default: 1},
        last_login: Date,
        mailok: Boolean,
        email_notifications: {type: Boolean, default: true},
		subscriptions: {},
		subscriptionUrl: String,
		language: String,
		locale: String,
		address: {type: {}, formtype: 'location'},
		phone: [],
		nif: String,
		jQueryUiTheme: String,
		data: {},
		cart: {type: ShoppingCart.schema, default: null},
		auth0_data: {},
		facebook: {}, // @deprecated
		devices: [{
			regId: String,
			prevType: String,
			uuid: String,
			version: String,
			model: String,
			platform: String,
			title: String,
			custom: {}
		}]
	}, {
		identifier: 'uname',
		collection: 'user',
		created: true
	});

	/**
	 * encripta password antes de ser guardado
	 * @param {function} next
	 */
	s.pre('save', function(next) {
		if(!this.isModified('pass'))
			return next();

		this.pass = md5(this.pass);

		next();
	});

	s.methods = {
		baseInfo: function(){
			return {
				'id': this.id,
				'uname': this.getName(),
				'name': this.getName(true),
				'isAdmin': this.isAdmin(),
				'level': this.level,
				'type': this.type || undefined,
				'picture': this.getImage('square'),
				'fbid': this.facebook && this.facebook.id
			};
		},
		getName: function(usereal){
			return usereal ? this.name || this.uname : this.uname;
		},
		isAdmin: function(){
			return this.level > 1;
		},
		getImage: function(type = 'normal', height){
			let q = '?';

			if(height)
				q += 'width=' + type + '&height=' + height;
			else
				q += 'type=' + type;

			if(this.facebook && this.facebook.username)
				return '//graph.facebook.com/' + this.facebook.id + '/picture' + q;

			return this.image ? this.image + q : undefined;
		},
		subscribe2Item: function(ref){
			if(ref.toJSON)
				ref = ref.toJSON();

			const colname = ref.namespace.replace('dynobjects.', '');

			if(!this.subscriptions)
				this.subscriptions = {};

			if(!this.subscriptions[ref.db])
				this.subscriptions[ref.db] = {};

			if(!this.subscriptions[ref.db][colname])
				this.subscriptions[ref.db][colname] = {};

			if(!this.subscriptions[ref.db][colname].items)
				this.subscriptions[ref.db][colname].items = [];

			this.subscriptions[ref.db][colname].items.push(ref.$id);

			this.save();
		},
		getLink: function(){
			return '/users/' + (this.uname || this.id);
		},
		htmlLink: function(){
			return  '<a href="' + this.getLink() + '">' + this.uname + '</a>';
		},
		fromAuth0: function(p){
			const obj = {
				uname: p.nickname,
				name: p.name,
				given_name: p.given_name,
				family_name: p.family_name,
				email: p.email,
				email_verified: p.email_verified,
				picture: p.picture,
				auth0_user_id: p.user_id,
				locale: p.locale,
				gender: p.gender,
				url: p.link,
				auth0_data: {}
			};

			const data = Object.extend({}, p);

			delete data.nickname;
			delete data.name;
			delete data.given_name;
			delete data.family_name;
			delete data.email;
			delete data.email_verified;
			delete data.picture;
			delete data.user_id;
			delete data.locale;
			delete data.gender;
			delete data.link;

			obj.auth0_data[p.user_id] = data;

			return this.set(obj).save();
		}
	};

	s.statics.findAndGetValues
		= s.statics.findAndGetValues4Show
		= function(req, query, fields, options){
			if(typeof query === 'function')	//old compat
				query = null;
			
			return this
				.find(query, fields, options)
				.then(result =>
					new Promise((ok, ko) => {
						let values = [];
						let count = 0;

						result.forEach(item => {
							item.getValues(req).then(v => {
								values.push(v);

								if(++count === result.length)
									ok(values);
							});


						});
					})
				);
		};

	return s;
};