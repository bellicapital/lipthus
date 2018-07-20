"use strict";

const fs = require('fs');
const Sermepa = require('sermepa');
const debug = require('debug')('site:dsresponse');

debug.log = console.log.bind(console);

module.exports = function DsResponse(req, res, next){
	debug('method %s', req.method);

	if(req.method === 'GET')
		return res.send('POST required');

	const log = JSON.stringify({
		date: new Date(),
		post: req.body,
		ip: req.ip
	}, null, '\t');

	debug('body', req.body);
	debug('ip', req.ip);

	fs.writeFile(req.site.dir + '/dsresponse_log.json', log, function(err){
		if(err)
			console.error(err.stack);
	});

	const r = Sermepa.processResponse(req.site.config.pay.signature, req.body);

	if(r.error)
		return next(r.error);

	const params = r.params;
	
	debug('params', params);

	return req.db.payment
		.findById(params.Ds_MerchantData)
		.then(payment => {
			if(!payment)
				return next(new Error('payment ' + params.Ds_MerchantData + ' not found'));

			payment.log.push({
				type: 'response',
				url: req.ip,
				params: params
			});

			if(params.Ds_ErrorCode)
				console.error(new Error(params.Ds_ErrorCode));
			else if(parseInt(params.Ds_Response) < 100){
				payment.set('status', 'approved');
				payment.set('paytime', new Date());
			} else
				payment.set('status', 'denied');

			debug('payment save ready');

			payment.save(function(err){
				res.send(req.body.test ? payment.getInfo(req) : null);

				req.db.payment.emit('dsResponse', payment);

				if(err)
					return console.error(err.stack);
			});
		})
		.catch(next);
};