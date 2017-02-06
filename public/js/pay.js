/* global euca */

$.extend({
	pay: function(url, params){
		url = url || euca.tpvUrl;
		params = params || euca.payParams;

		if(!url)
			return console.log('tpvUrl not defined');

		if(!params)
			return console.log('payParams not defined');

		var $form = $('<form action="' + url + '" method="post"></form>').appendTo('body');

		$.each(params, function(k,v){
			$form.append('<input type="hidden" name="' + k + '" value="' + v + '"/>');
		});

//		console.log(url, params);
//		return;
		$form.submit();
	}
});