"use strict";


class ShopPayParams {
	constructor(opt) {
        this.pay_test = true;

        this.paypal_primary_email = '';
        this.paypal_primary_email_sandbox = '';

        this.url_tpvv = '';
        this.url_tpvv_test = '';
        this.merchantCode = '';
        this.merchantTitular = '';
        this.merchantSignature = '';
        this.merchantSignatureTest = '';
        this.merchantName = '';
        this.baseUrlOK = '/payments/:id';
        this.baseUrlKO = '/payments/:id';

        Object.each(opt, (k, v) => this[k] = v);

        if(process.env.NODE_ENV === 'development')
            this.pay_test = true;

        Object.defineProperty(this, 'signature', {get: function(){
            return this.pay_test ? this.merchantSignatureTest : this.merchantSignature;
        }});
    }

	url() {
        return this.pay_test ? this.url_tpvv_test : this.url_tpvv;
    }

	urlOK(id) {
        return this.baseUrlOK.replace(':id', id);
    }

	urlKO(id) {
        return this.baseUrlKO.replace(':id', id);
    }

	formVars(req, cb) {
        req.ml.load('ecms-shopping').then(lc => {
            cb(null, {
                pay_test: {
                    formtype: 'yesno',
                    caption: lc._PAY_TESTMODE,
                    value: this.pay_test
                },
                paypal_primary_email: {
                    formtype: 'text',
                    caption: lc._PAY_PAL_PRIMARY_EMAIL,
                    value: this.paypal_primary_email
                },
                paypal_primary_email_sandbox: {
                    formtype: 'text',
                    caption: lc._PAY_PAL_PRIMARY_EMAIL_SANDBOX,
                    value: this.paypal_primary_email_sandbox
                },
                url_tpvv: {
                    formtype: 'text',
                    caption: lc._PAY_URL,
                    value: this.url_tpvv
                },
                url_tpvv_test: {
                    formtype: 'text',
                    caption: lc._PAY_TESTURL,
                    value: this.url_tpvv_test
                },
                merchantCode: {
                    formtype: 'text',
                    caption: lc._PAY_IDCOMERCIO,
                    value: this.merchantCode
                },
                merchantTitular: {
                    formtype: 'text',
                    caption: lc._PAY_TITULAR,
                    value: this.merchantTitular
                },
                merchantSignature: {
                    formtype: 'text',
                    caption: lc._SIGNATURE,
                    value: this.merchantSignature
                },
                merchantSignatureTest: {
                    formtype: 'text',
                    caption: lc._SIGNATURE + ' (test)',
                    value: this.merchantSignatureTest
                },
                merchantName: {
                    formtype: 'text',
                    caption: lc._PAY_MERCHANTNAME,
                    value: this.merchantName
                },
                baseUrlOK:{
                    formtype: 'text',
                    caption: 'baseUrlOK',
                    value: this.baseUrlOK
                },
                baseUrlKO:{
                    formtype: 'text',
                    caption: 'baseUrlKO',
                    value: this.baseUrlKO
                },
                dsresponseUrl:{
                    formtype: 'text',
                    caption: 'dsresponseUrl',
                    value: this.dsresponseUrl
                }
            });
        });
    }

    static getFormVars(req, res, cb){
        req.site.config.pay.formVars(req, cb);
    }
}

module.exports = ShopPayParams;