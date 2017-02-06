(function($){

$.fn.innerProgressBar = function(options){
	if(typeof options === 'number')
		options = {value: options};

	return this.each(function(){
		var $me = $(this),
			data = $me.data('innerProgressBar'),
			pos = $me.position(),
			$ipg,
			o;

		if(!data){
			o = $.extend({
				height: 2,
				bottom: $me.height()/3,// a un tercio del contenedor
				left: 10,
				theme: 'd',
				value: 0
			}, options);
			
			$ipg = $('<div class="innerProgressBar">').insertAfter(this);

			$ipg.addClass('ui-btn-down-' + o.theme + ' ui-btn-corner-all')
				.css({
					position: 'absolute',
					overflow: 'visible'
				})
				.append('<div class="ui-slider-bg ui-btn-active ui-btn-corner-all" style="background-color:rgb(136, 221, 255);height:2px"></div>');

			$me.data('innerProgressBar', {ipg: $ipg, options: o});
		} else {
			$ipg = data.ipg;
			
			$.extend(data.options, options);
			
			o = data.options;
		}
		
		$ipg.css({
			top: pos.top + $me.height() - o.bottom,
			left: pos.left + o.left,
			width: $me.width() - o.left*2 - 2,
			height: o.height
		})
		.find('div').width(o.value + '%');
	});
};

})(jQuery);