
module.exports = function(req, res, next){
	if(req.cookies.cookieLaw)
		return next();
	
	res.cookie('cookieLaw', '1', {maxAge: 3600000*24*90});
	
	//TODO: use db
	res.locals.cookieLaw = req.ml && req.ml.lang === 'en'
		? "We use cookies to ensure that we give you the best experience on our website. \nIf you continue without changing your settings, we'll assume that you are happy to receive all cookies from this website."
		: "Este sitio web utiliza cookies propias y de terceros para poderte ofrecer una mejor experiencia de navegación. \nSi sigues navegando sin cambiar la configuración, aceptas el uso de cookies en nuestro sitio.";

	next();
};