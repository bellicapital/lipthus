const Config = require('./config');

module.exports = function(site){
	return new Config(site).load();
};