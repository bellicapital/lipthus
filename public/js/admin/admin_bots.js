"use strict";

(function($) {

	var $c;

	$.fn.logBots = function () {
		$c = $(this).load('/bots');
	};

	$('body').on('click', '#admin-bots a.bot-l', function(e){
		e.preventDefault();

		$c.empty().load(this.href);
	}).on('click', '#bot-back', function(e){
		$c.logBots();
	});

})(jQuery);