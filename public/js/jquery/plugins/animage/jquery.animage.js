/*!
 * Image animator
 *
 * Animates an aimge based on zoom and position
 *
 * @copyright eucalipthus.com
 * @param object options
 * @param float options.maxZoom
 * @param string|float options.speed
 * @param string options.cyrcle alternates the animation: 'random' => ramdomly, 'seq' => sequentially, 'all' => No alternate
 */
(function( $ ){

	var methods = {
		
		init: function(options){
			var me = this.addClass('animage'),
				curIdx = -1,
				s = $.extend({
					maxZoom: 1.5,
					duration: 4000,
					cyrcle: 'all',
					easing: 'linear' //swing|linear
				}, options || {});

			function activateNext(){
				var $dest;
				if(s.cyrcle == 'random')
					$dest = me.eq(rand(0, me.size()-1));
				else if(s.cyrcle == 'seq'){
					if(++curIdx == me.size())
						curIdx = 0;
					$dest = me.eq(curIdx);
				} else
					$dest = me;
				$dest.trigger('activate');
			}

			this.each(function(){
				var $me = $(this).data('animage', s),
					img,
					div,
					nw,
					nh,
					minWidth,
					minHeight,
					cWidth = $me.width(),
					cHeight = $me.height(),
					margin = {
						marginLeft: $me.css('margin-left'),
						marginRight: $me.css('margin-right'),
						marginTop: $me.css('margin-top'),
						marginBottom: $me.css('margin-bottom')
					};
				if(this.tagName == 'IMG'){
					img = this;
					div = $(this).wrap('<div></div>').parent().css(margin);
				} else {
					div = this;
					var src = $(this).css('background-image');
					if(src != 'none'){
						src = src.replace(/url\(["']?([^"'\)]+).*/, '$1');
						this.style.backgroundImage = null;
						img = $('<img src="' + src + '"/>').prependTo(this).css({top: 0, left: 0})[0];
					} else {
						img = $('img:first', this);
						if(img.size())
							img = img[0];
						else
							return;
					}
				}
				
				$(div).css({
					position: 'relative',
					overflow: 'hidden',
					width: cWidth,
					height: cHeight
				});
				$(img).load(function(){
					nw = this.naturalWidth;
					nh = this.naturalHeight;
					function setMins(){
						minWidth = cWidth;
						minHeight = nh * cWidth / nw;
						if(minHeight < cHeight){
							minHeight = cHeight;
							minWidth = nw * cHeight / nh;
						}
					}
					setMins();
					$(this).css({
						position: 'absolute',
						width: minWidth,
						height: minHeight,
						margin: 0
					});
					$(div).resize(function(){
						$(img).stop();
						cWidth = $(this).width();
						cHeight = $(this).height();
						setMins();
						activateNext();
					});
				});

				function activate(){
					if(!nw){
						$(img).load(activate);
						return;
					}
					var ratio = 1 + (s.maxZoom -1) * Math.random(),
						newWidth = Math.round(ratio * minWidth),
						newHeight = Math.round(ratio * minHeight),
						param = {
							width: newWidth,
							height: newHeight,
							left: - rand(0, newWidth - $(this).parent().width()),
							top: - rand(0, newHeight - $(this).parent().height())
						};
					$(img).animate(param, s.duration, s.easing, s.cyrcle == 'all' ? activate : activateNext);
				}
				$(this).bind('activate', activate);
			});
		
			activateNext();
			return this;
		},
		destroy: function(){
			return this.each(function(){
				//TODO
			});
		},
		option: function(name, value){
			var d = this.stop().data('animage');
			d[name] = value;
			if(d.cyrcle == 'all')
				this.trigger('activate');
			else
				this.eq(0).trigger('activate');
			
			return this;
		}
	};

/**
 *
 * @return jQuery
 **/
	$.fn.animage = function(options){
		if (methods[options])
			return methods[options].apply( this, Array.prototype.slice.call(arguments, 1));
		else if (typeof options === 'object' || ! options)
			return methods.init.apply(this, arguments);
		else
			return $.error('Method ' +  options + ' does not exist on jQuery.animage');
	};

	/*
	 * Helper functions
	 */
	function rand(lower, higher){
		var posible = higher - lower;
		return parseInt(lower) + Math.round(Math.random() * posible);
	}
})(jQuery);