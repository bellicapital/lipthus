$.fn.adminHelocheck = function(){
	var $me = this.addClass('ui-widget-content ui-corner-all')
		.css({padding: 10, whiteSpace: "pre-wrap"}).loading();

	$.ajax({
		data: {cl: 'misc', method: 'helocheck'}
	}).done(function(d){
		$me.html(JSON.stringify(d, null, '\t')).endLoading();
	});
};