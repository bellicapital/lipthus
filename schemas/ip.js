"use strict";

const ipLocation = require('../modules/geo').ipLocation;
const urlContent = require('../modules/utils').urlContent;
const geobytes = "http://gd.geobytes.com/GetCityDetails?fqcn=";
const expire = 3600 * 24 * 30;//un mes

module.exports = function ip(Schema){
	const s = new Schema({
		ip: {type: String, index: true, unique: true},
		city: String,
		region: String,
		country: String,
		countryName: String
	}, {
		collection: 'ips',
		created: true,
		lastMod: true
	});
	
	s.methods = {
		expired: function(){
			return this.modified.getTime() + expire < Date.now();
		}
	};
	
	s.statics = {
		get: function(ip, cb){
			return new Promise((ok, ko) => this.get_(ip, (err, r) => {
				err ? ko(err) : ok(r);

				if(cb)
					console.warn('schema ip.statics.get() now uses Promise. Not callbacks');
			}));
		},
		get_: function(ip, cb){
			this.findOne({ip: ip}, (err, obj) => {
				if(err)
					return cb(err);
				
				if(obj){
					cb(null, ipLocation(obj.toObject()));
					
					if(!obj.expired())
						return;
				}
				
				urlContent(geobytes + ip, (err, data) => {
					if(err || !data){
						if(!obj)
							cb(err, data);
						else
							console.error(err);
						
						return;
					}
					
					try{
						const d = JSON.parse(data);
					
						const params = {
							ip: ip,
							city: d.geobytescity,
							region: d.geobytesregion,
							country: d.geobytesinternet,
							countryName: d.geobytescountry
						};
					} catch(err){
						if(!obj)
							cb(err);
						else
							console.error(err);
						
						return;
					}
					
					if(obj){
						obj.set(params);
						
						obj.save(function(err){
							if(err)
								console.err(err);
						});
					} else {
						this.create(params, (err, obj) => {
							if(err)
								return cb(err);
							
							cb(null, ipLocation(obj.toObject()));
						});
					}
				});
			});
		}
	};
	
	return s;
};