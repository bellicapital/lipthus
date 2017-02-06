(function($){

$.fitCalc = function(width, height, max_width, max_height){
	if(width <= max_width && height <= max_height)
		return {width: width, height: height};
	var s = Math.min(max_width / width, max_height / height);
	return {width: s * width, height: s * height};
};

$.fn.appendThumb = function(options){
	var o = $.extend({
		src: null,
		title: 'Click para ampliar imagen',
		thumbMaxWidth: null,
		thumbMaxHeight: null,
		imgWidth: null,
		imgHeight: null,
		onOpen: $.noop,
		onClose: $.noop,
		returnThumb: false,
		expose: {},
		speed: 'normal',
		overlay: true
	}, options);
	var onLoad = o.expose.onLoad, zIndex = o.expose.zIndex || 10001;
	$.extend(o.expose, {
		onLoad: function(){
			onLoad && onLoad();
		},
		zIndex: zIndex
	});
	var ret;
	this.each(function(){
		var img = new Image(), w = o.thumbMaxWidth, h = o.thumbMaxHeight, api, ov;
		if(w){//si nos dan el máximo de ancho
			var fc = $.fitCalc(o.imgWidth, o.imgHeight, o.thumbMaxWidth, o.thumbMaxHeight);
			w = fc.width;
			h = fc.height;
		}
		var src = o.src;
		
		$.extend(img, {
			src: src,
			draggable: false,
			height: h,
			width: w
		});
		img.style.cursor = 'pointer';
		var thumb = $(img).appendTo(this).hide().load(function(){
			$(this).show();
		});
		if(o.overlay){
			thumb.thumbOverlay({
				src: o.src,
				imgWidth: o.imgWidth,
				imgHeight: o.imgHeight,
				fileObj: o.fileObj
			});
		}
		ret ? ret.add(thumb) : (ret = thumb);
	});

	return o.returnThumb ? ret : this;
};
$.fn.thumbOverlay = function(options){
	return this.each(function(){
		var $me = $(this);
		var o = $.extend({
			src: $me.attr('src'),
			width: this.width,
			height: this.height
		}, options);
		// precarga la imagen
		var fullImg = new Image();
		fullImg.src = o.src;
		$me.disableSelection().click(function(){//open the overlay
			o.imgWidth = o.imgWidth || fullImg.naturalWidth;
			o.imgHeight = o.imgHeight || fullImg.naturalHeight;
			var fit = $.fitCalc(o.imgWidth, o.imgHeight, $(window).width() - 100, $(window).height() - 100);
			var curpos = $me.offset();
			var css = {
				position: 'absolute',
				left: curpos.left,
				top: curpos.top,
				zIndex: 10002,
				cursor: 'move',
				width: o.width,
				height: o.height
			};
			css.boxShadow = '15px 10px 10px rgba(0, 0, 0, .5)';

			var animate = {
				width: fit.width,
				height: fit.height,
				left: Math.max(20, curpos.left - (fit.width - o.width) / 2),
				top: Math.max(20, curpos.top - (fit.height - o.height) / 2)
			};

			$(fullImg).appendTo('body')
				.css(css).animate(animate, function(){
					if(o.fileObj && o.fileObj.duration){
						$(this).remove();
						var width = euca.user.isAdmin ? 870 : o.imgWidth;
						var height = euca.user.isAdmin ? 600 : o.imgHeight;
						var $dialog = $('<div style="width:' + width + 'px; height: ' + height + 'px"/>').dialog({
							title: o.fileObj.name,
							width: width + 26,
							height: height + 36,
							modal: true,
							close: function(){$(this).dialog('destroy').remove();}
						});
						if(euca.user.isAdmin)
							$dialog.adminVideo(o.fileObj);
						else
							$dialog.video({
								autoPlay: true,
								url: 'fs/videos/' + o.fileObj.fileId
							});
					} else {
						$(this).draggable();
						$('body').one('click', function(){// restore img to initial size
							curpos = $me.offset();// por si se ha movido la posición de la ventana
							$(fullImg).animate({width: o.width, height: o.height, left: curpos.left, top: curpos.top}, 500, function(){
								$(fullImg).remove();
								$me.blur();
							});
						});
					}
					//$(document).one('keypress', function(){$(fullImg).remove()});
				});
		});
	});
};

})(jQuery);