"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = exports.name = void 0;
const lib_1 = require("../lib");
const md5 = require('md5');
exports.name = 'user';
function getSchema(site) {
    const s = new lib_1.LipthusSchema({
        uname: { type: String, size: 20, maxlength: 25, index: { unique: true } },
        name: String,
        given_name: String,
        family_name: String,
        alias: String,
        email: { type: String, formtype: 'email', required: true, index: { unique: true } },
        email_verified: Boolean,
        url: { type: String, formtype: 'url' },
        picture: String,
        image: { type: String, formtype: 'image' },
        location: { type: {}, formtype: 'location' },
        actkey: String,
        gender: String,
        birthday: String,
        pass: { type: String, maxlength: 32 },
        level: { type: Number, formtype: 'int', default: 0 },
        type: String,
        timezone_offset: { type: Number, default: 1 },
        last_login: Date,
        mailok: Boolean,
        email_notifications: { type: Boolean, default: true },
        subscriptions: {},
        subscriptionUrl: String,
        language: String,
        locale: String,
        address: { type: {}, formtype: 'location' },
        phone: [],
        nif: String,
        data: {},
        oauth_user_id: String,
        oauth_data: {},
        facebook: {},
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
        versionKey: '--v' // needed in mongoose 3.5.x when authenticating the user
    });
    /**
     * encripta password antes de ser guardado
     * @param {function} next
     */
    s.pre('save', function (next) {
        if (!this.isModified('pass'))
            return next();
        this.pass = md5(this.pass);
        next();
    });
    s.methods = {
        baseInfo: function (includeEmail = false) {
            const ret = {
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
        getName: function (useReal) {
            return (useReal ? this.name || this.uname : this.uname || this.name) || '';
        },
        /**
         * @returns {boolean}
         */
        isAdmin: function () {
            return this.level > 1;
        },
        getImage: function (type = 'normal', height) {
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
        subscribe2Item: function (ref) {
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
        getLink: function () {
            return '/users/' + (this.uname || this.id);
        },
        htmlLink: function () {
            return '<a href="' + this.getLink() + '">' + this.uname + '</a>';
        },
        fromOAuth2: function (p) {
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
            = function (req, query, fields, options) {
                return this
                    .find(query, fields, options)
                    .then((result) => {
                    const values = [];
                    return Promise.all(result.map(item => item.getValues(req).then((v) => values.push(v))))
                        .then(() => values);
                });
            };
    s.statics.fromOAuth2 = function (params) {
        const email = params.email || params.emails && params.emails[0].value;
        return this.findOne({ email: email })
            .then((u) => {
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
    s.virtual('formatEmailTo').get(function () {
        return this.getName(true) + '<' + this.get('email') + '>';
    });
    return s;
}
exports.getSchema = getSchema;
