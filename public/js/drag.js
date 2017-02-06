(function($){
	$(function(){
		var $body = $('body');
		
		$body.on('mousedown touchstart', function(e){
		
			var offset, start;
				
			if(e.type === 'touchstart'){
				var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
				offset = [touch.pageX, touch.pageY];
			} else
				offset = [e.pageX, e.pageY];
			
			var x, y;
		
			$body.on('mouseup mousemove touchend touchmove touchcancel', function handler(e) {
				if (e.type === 'mouseup' || e.type === 'touchend' || e.type === 'touchcancel') {
					// click
					$body.off('mouseup mousemove touchend touchmove touchcancel', handler);
					$(e.target).trigger('dragend');
				} else {
					// drag
					if(e.type === 'touchmove'){
						var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
						
						x = touch.pageX;
						y = touch.pageY;
					} else {
						x = e.pageX,
						y = e.pageY;
						
						e.preventDefault();
					}
				
					$(e.target).trigger('drag', [x - offset[0], y - offset[1], !start]);
					
					if(!start){
						start = true;
//						$(e.target).trigger('dragstart')
					}
				}
			});
		});
	});
	
	$.fn.swipe = function(opt){
		var o = $.extend({
			limit: 100,
			duration: 700
		}, opt);
		
		return this.addClass('draggable')
			.disableSelection()
			.each(function(){
				var $me = $(this),
					initialPos,
					lastPos,
					width;
		
				$me.on('drag', function(e, x, start){
					if(start){
						initialPos = parseInt($me.css('left'), 10) || 0;
						lastPos = initialPos;
						width = $me.width();
					}
					
					var pos = initialPos + x;

					if(pos > o.limit)
						pos = o.limit;
					else if(pos < 960 - width - o.limit)
						pos = 960 - width - o.limit;

					if(pos === lastPos)
						return;

					$me[0].style.left = pos + 'px';

					lastPos = pos;
				}).on('dragend', function(){
					var pos = lastPos;

					if(pos > 0)
						pos = 0;
					else if(pos < 960 - width)
						pos = 960 - width;

					$me.animate({left: pos});
				});
			});
	};
	
})(jQuery);