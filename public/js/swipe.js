(function($){
	
	$.fn.swipe = function(opt){
		var o = $.extend({
			limit: 100,
			duration: 700
		}, opt);
		
		return this.disableSelection().each(function(){
			var $me = $(this),
				item = 0;

			$me.on('swipeleft', function(e){
				if(Math.abs(parseInt($me.css('left'), 10)) > $me.width() - $me.parent().width())
					return;
				
				item++;
				
				move2Item();
			}).on('swiperight', function(e){
				if(item === 0)
					return;
				
				item--;
				
				move2Item();
			});
			
			function move2Item(){
				var $children = $me.children();
				
				if($children.size() <= item){
					item = $children.size() - 1;
					return;
				}
				
				$me.animate({left: -$children.eq(item).position().left});
			}
		});
	};
	
})(jQuery);