/* global module */

module.exports = function(req, res){
	res.status(404).render(req.cmsDir + '/views/status/404', {host: req.headers.host});
};