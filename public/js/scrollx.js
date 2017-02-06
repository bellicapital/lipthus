(function($){
	
	$.fn.scrollX = function(){
		
		return this.on('swipeleft', function(){
			$(this).animate({scrollLeft: $(this).scrollLeft() + 300});
		}).on('swiperight', function(e){
			$(this).animate({scrollLeft: $(this).scrollLeft() - 300});
		});
	};
	
})(jQuery);