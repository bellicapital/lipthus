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
		oauth_user_id: String,
		oauth_data: {},
		facebook: {}, // @deprecated
		devices: [{
			regId: String,
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
		baseInfo: function(includeEmail = false){
			const ret = {
				'id': this.id,
				'uname': this.getName(),
				'name': this.getName(true),
				'isAdmin': this.isAdmin(),
				'level': this.level,
				'type': this.type || undefined,
				'picture': this.getImage('square'),
				'fbid': this.facebook && this.facebook.id
			};

			if (includeEmail)
				ret.email = this.email;

			return ret;
		},
		getName: function(usereal){
			return usereal ? this.name || this.uname : this.uname || this.name;
		},
        /**
		 * @deprecated
         * @returns {boolean}
         */
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

			if(this.picture)
				return this.picture;

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
		fromOAuth2: function(p){
			const obj = {
				name: p.displayName,
				given_name: p.name.givenName,
				family_name: p.name.familyName,
				picture: p.image.url,
				oauth_user_id: p.id,
				language: p.language,
				gender: p.gender,
				url: p.url,
				last_login: new Date(),
				mailok: true,
				oauth_data: {}
			};

			const data = Object.extend({}, p);

			delete data.displayName;
			delete data.name;
			delete data.email;
			delete data.image;
			delete data.id;
			delete data.language;
			delete data.gender;
			delete data.url;

			obj.oauth_data = data;

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
					new Promise(ok => {
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

	s.statics.fromOAuth2 = function(params){
		return this.findOne({email: params.email})
			.then(u => {
				if(!u)
					u = new this({
						email: params.email,
						level: 1
					});

				return u.fromOAuth2(params);
			});
	};

	return s;
};
