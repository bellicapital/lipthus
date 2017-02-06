(function($){
	$.fn.eucaSelectable = function(options){
		var o = $.extend({
			defaultClass: 'ui-state-default',
			hoverClass: 'ui-state-hover',
			activeClass: 'ui-state-active',
			icon: null,
			iconActive: null,
			select: $.noop
		}, options);
		return this.addClass('eucaSelectable').each(function(){
			var me = this, $icons, iconSelector;
			var $items = $('>*', this).addClass(o.defaultClass);
			
			$(this).on('click', '>*', function(e){
				$('>*', me).removeClass(o.activeClass);
				$(this).addClass(o.activeClass);
				if(o.iconActive){
					var $curIcon = $(this).find(iconSelector),
						isActive = $curIcon.hasClass(o.iconActive);
					$icons.filter('.' + o.iconActive).toggleClass(o.iconActive + ' ' + o.icon);
					if(!isActive)
						$curIcon.toggleClass(o.iconActive + ' ' + o.icon);
				}
				return o.select.call(this, e);
			}).on('mouseover mouseout', '>*', function(){$(this).toggleClass(o.hoverClass);});
		
			if(o.icon){
				o.icon = 'ui-icon-' + o.icon;
				if(o.iconActive)
					o.iconActive = 'ui-icon-' + o.iconActive;
				var $toIconize = $items.find('>a');
				if($items.size() !== $toIconize.size()){
					$toIconize = $items;
					iconSelector = '>span.ui-icon';
				} else
					iconSelector = '>a>span.ui-icon';
				$toIconize.prepend('<span class="ui-icon ' + o.icon + '" style="float:left"></span>');
//				$items.css('clear', 'left');
				$icons = $toIconize.find('>span');
			}
		});
	};
})( jQuery );