import {LipthusSchema} from "../lib";
import {LipthusRequest, Site} from "../index";
import {Document, Model} from "mongoose";
import {GoogleOauth2Data} from "../modules/auth";

const md5 = require('md5');

export const name = 'user';

export function getSchema(site: Site) {
	const s = new LipthusSchema({
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
		pass: {type: String, maxlength: 32},
		level: {type: Number, formtype: 'int', default: 0},
		type: String,	// tipo de usuario especial (translator, blogger, ...)
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
		data: {},
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
		created: true,
		versionKey: '--v'	// needed in mongoose 3.5.x when authenticating the user
	});

	/**
	 * encripta password antes de ser guardado
	 * @param {function} next
	 */
	s.pre('save', function (this: any, next: () => void) {
		if (!this.isModified('pass'))
			return next();

		this.pass = md5(this.pass);

		next();
	});

	s.methods = {
		baseInfo: function (this: any, includeEmail: boolean = false) {
			const ret: any = {
				id: this.get('_id').toString(),
				uname: this.uname,
				name: this.name || '',
				level: this.level,
				type: this.get('type') || undefined,
				picture: this.getImage('square'),
				fbid: this.facebook && this.facebook.id
			};

			if (includeEmail)
				ret.email = this.email;

			return ret;
		},
		getName: function (this: any, useReal?: boolean) {
			return (useReal ? this.name || this.uname : this.uname || this.name) || '';
		},
		/**
		 * @returns {boolean}
		 */
		isAdmin: function (this: any) {
			return this.level > 1;
		},
		getImage: function (this: any, type: any = 'normal', height?: number | string) {
			let q = '?';

			if (height)
				q += 'width=' + type + '&height=' + height;
			else
				q += 'type=' + type;

			if (this.facebook && this.facebook.username)
				return '//graph.facebook.com/' + this.facebook.id + '/picture' + q;

			if (this.get('picture'))
				return this.get('picture');

			if (this.get('image'))
				return this.get('image') + q;

			return 'http://www.gravatar.com/avatar/' + md5(this.email) + '?s=90';
		},
		subscribe2Item: function (this: any, ref: any) {
			if (ref.toJSON)
				ref = ref.toJSON();

			const colname = ref.namespace.replace('dynobjects.', '');

			if (!this.subscriptions)
				this.subscriptions = {};

			if (!this.subscriptions[ref.db])
				this.subscriptions[ref.db] = {};

			if (!this.subscriptions[ref.db][colname])
				this.subscriptions[ref.db][colname] = {};

			if (!this.subscriptions[ref.db][colname].items)
				this.subscriptions[ref.db][colname].items = [];

			this.subscriptions[ref.db][colname].items.push(ref.$id);

			this.save();
		},
		getLink: function (this: any) {
			return '/users/' + (this.uname || this.id);
		},
		htmlLink: function (this: any) {
			return '<a href="' + this.getLink() + '">' + this.uname + '</a>';
		},
		fromOAuth2: function (this: any, p: GoogleOauth2Data) {
			return this.set({
				name: p.name || p.displayName || this.uname,
				given_name: p.given_name,
				family_name: p.family_name,
				picture: p.picture || p.image && p.image.url,
				oauth_user_id: p.sub || p.id,
				language: p.locale || p.language,
				gender: p.gender,
				url: p.profile,
				last_login: new Date(),
				mailok: true,
				oauth_data: p
			})
				.save();
		}
	};

	s.statics.findAndGetValues
		= s.statics.findAndGetValues4Show
		= function (this: any, req: LipthusRequest, query: any, fields: any, options: any) {

		return this
			.find(query, fields, options)
			.then((result: Array<User>) => {
				const values: Array<any> = [];

				return Promise.all(result.map(item => item.getValues(req).then((v: any) => values.push(v))))
					.then(() => values);
			});
	};

	s.statics.fromOAuth2 = function (this: any, params: GoogleOauth2Data) {
		const email = params.email || params.emails && params.emails[0].value;

		return this.findOne({email: email})
			.then((u: User) => {
				if (!u) {
					if (!site.config.allow_register)
						return;

					u = new this({
						email: email,
						uname: email,
						level: 1
					});
				}

				return u.fromOAuth2(params);
			});
	};

	s.virtual('formatEmailTo').get(function (this: User) {
		return this.getName(true) + '<' + this.get('email') + '>';
	});

	return s;
}

export interface User extends Document {
	key: string;
	uname: string;
	name: string;
	pass: string;
	level: number;
	cart: any;
	email: string;
	language: string;
	phone: Array<string>;
	address: any;
	devices: Array<any>;
	subscriptions: any;
	type?: string;
	email_notifications?: boolean;
	formatEmailTo?: string;
	data?: any;

	// noinspection JSUnusedLocalSymbols
	fromOAuth2(params: any): Promise<any>;

	// noinspection JSUnusedLocalSymbols
	getImage(typeOrWidth: string | number, height?: number): string;

	// noinspection JSUnusedLocalSymbols
	subscribe2Item(ref: any): Promise<any>;

	// noinspection JSUnusedLocalSymbols
	getName(useReal?: boolean): string;

	// noinspection JSUnusedLocalSymbols
	baseInfo(includeEmail?: boolean): any;

	isAdmin(): boolean;

	// noinspection JSUnusedLocalSymbols
	htmlLink(): string;

	getValues(req: LipthusRequest): Promise<any>;

	// set(key: string, value: any, type: any, options?: any): void;
	save(): Promise<any>;
}

export interface UserModel extends Model<User> {

	// noinspection JSUnusedLocalSymbols
	fromOAuth2(params: any): Promise<any>;

	// noinspection JSUnusedLocalSymbols
	findAndGetValues(params: any): Promise<any>;

	// noinspection JSUnusedLocalSymbols
	findAndGetValues4Show(params: any): Promise<any>;
}
