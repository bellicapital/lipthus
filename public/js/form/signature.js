"use strict";


(function($){

var methods = {
	init: function(options){
		return this.each(function(){
			var $this = $(this);

			var s = $.extend({
				width: this.dataset.width || 600,
				height: this.dataset.height || 320,
				fillStyle: "#fff",
				strokeStyle: "#444",
				lineWidth: 1.5,
				lineCap: "round",
				title: 'Firma',
				saveText: 'Guardar',
				clearText: 'Limpiar',
				signText: 'Firmar',
				deleteText: 'Borrar',
				cancelText: 'Cancelar',
				uiButtons: true,
				onTabletConnected: $.noop,
				image: this.value || this.dataset.value,
				logoTablet: null,
				$container: (this.tagName === 'INPUT' ? $this.wrap('<div>').parent() : $this).addClass('signature')
			}, options );

			$this.data('signature', s);

			var $butt = $('<div style="text-align:center" class="ui-mini">').appendTo(s.$container);

			s.$signBtn = $('<input type="button" data-inline="true" data-theme="b" value="' + s.signText + '"/>')
				.appendTo($butt)
				.click(function(){
					sigPopup($this);
				});

			s.$delBtn = $('<input type="button" data-inline="true" data-theme="b" value="' + s.deleteText + '"/>')
				.appendTo($butt)
				.prop('disabled', !s.image)
				.click(function(){
					s.$img.remove();
					delete s.$img;
					s.$delBtn.prop('disabled', true).parent().addClass('ui-state-disabled');
					$this.val('').change();
				});

			if($.fn.button)
				$butt.find('input').button();

			if(s.image)
				methods.setImage.call($this, s.image);
		});
	},
	setImage: function(){
		return this.each(function() {
			var $this = $(this),
				s = $this.data('signature');

			if (!s)
				throw new Error("Attempting to set an image on a non initialized signature");

			if (!s.$img)
				s.$img = $('<img/>').prependTo(s.$container);

			s.$img.attr("src", s.image);

			s.$delBtn.prop('disabled', false).parent().removeClass('ui-state-disabled');
		});
	}
};

$.fn.signature = function(method) {
	if(methods[method]){
		return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
	} else if ( typeof method === 'object' || ! method || typeof method === 'function') {
		return methods.init.apply( this, arguments );
	} else {
		$.error( 'Method ' +  method + ' does not exist on jQuery.fb' );
		return this;
	}
};


window.onunload = window.onbeforeunload = function(){
	window.Tablet && Tablet.abort();
};


// Helper functions

function get_board_coords(e, canvas){
	var x, y;

	if (e.changedTouches && e.changedTouches[0]) {
		var offset = $(canvas).offset();

		x = e.changedTouches[0].pageX - offset.left;
		y = e.changedTouches[0].pageY - offset.top;
	} else if (e.layerX || 0 === e.layerX)	{
		x = e.layerX;
		y = e.layerY;
	} else if (e.offsetX || 0 === e.offsetX) {
		x = e.offsetX;
		y = e.offsetY;
	}

	return {
		x: x,
		y: y
	};
}



function sigPopup($c){
	var s = $c.data('signature');

	var $popup = $('<div id="signature-popup" data-history="false" class="ui-popup ui-body-b ui-overlay-shadow ui-corner-all">\
				<div class="ui-header ui-bar-a">\
					<h1 class="ui-title">' + s.title + '</h1>\
				</div>\
				<div id="signature-popup-content" role="main" class="ui-content"></div>\
			</div>');

	var $sigCont = $popup.find('#signature-popup-content')
		.css({
			minWidth: s.width + 'px',
			position: "relative"
		});

	var $canvas = $('<canvas>').appendTo($sigCont);
	var canvas = $canvas[0];
	var context = canvas.getContext("2d");

	canvas.width = s.width;
	canvas.height = s.height;
	context.fillStyle = s.fillStyle;
	context.strokeStyle = s.strokeStyle;
	context.lineWidth = s.lineWidth;
	context.lineCap = s.lineCap;

	context.fillRect(0, 0, canvas.width, canvas.height);

	var pixels = [];
	var xyLast = {};
	var xyAddLast = {};
	var calculate = false;

	function on_mouseup(e){
		//remove_event_listeners
		$canvas.unbind('mousemove touchmove');
		$canvas.unbind('mouseup touchend');

		document.body.removeEventListener('mouseup',  on_mouseup, false);
		document.body.removeEventListener('touchend', on_mouseup, false);

		context.stroke();
		pixels.push('e');
		calculate = false;
	}

	$canvas.bind('mousedown touchstart',  function(e){
		e.preventDefault();
		e.stopPropagation();

		$canvas.bind('mousemove touchmove', function(e){
			e.preventDefault();
			e.stopPropagation();

			var xy = get_board_coords(e.originalEvent, canvas);

			var xyAdd = {
				x: (xyLast.x + xy.x) / 2,
				y: (xyLast.y + xy.y) / 2
			};

			if (calculate) {
				var xLast = (xyAddLast.x + xyLast.x + xyAdd.x) / 3;
				var yLast = (xyAddLast.y + xyLast.y + xyAdd.y) / 3;
				pixels.push(xLast, yLast);
			} else {
				calculate = true;
			}

			context.quadraticCurveTo(xyLast.x,xyLast.y,xyAdd.x, xyAdd.y);
			pixels.push(xyAdd.x, xyAdd.y);
			context.stroke();
			context.beginPath();
			context.moveTo(xyAdd.x, xyAdd.y);
			xyAddLast = xyAdd;
			xyLast = xy;
		});

		$canvas.bind('mouseup touchend',   on_mouseup);

		document.body.addEventListener('mouseup',  on_mouseup, false);
		document.body.addEventListener('touchend', on_mouseup, false);

		var xy = get_board_coords(e.originalEvent, canvas);
		context.beginPath();
		pixels.push('moveStart');
		context.moveTo(xy.x, xy.y);
		pixels.push(xy.x, xy.y);
		xyLast = xy;
	});

	startTablet(s, context, $sigCont);

	var $butt = $('<div style="text-align:center">')
		.appendTo($sigCont)
		.append('<br/>');

	$('<input type="button" data-inline="true" class="signatureSave" value="' + s.saveText + '"/>')
		.appendTo($butt)
		.click(function () {
			s.image = canvas.toDataURL("image/png");

			methods.setImage.call($c);
			$c.val(s.image).change();
			Tablet.ok();
			$popup.popup('destroy');
		});

	$('<input type="button" data-inline="true" class="signatureClear" value="' + s.clearText + '"/>')
		.appendTo($butt)
		.click(function () {
			Tablet.connected && Tablet.start();
			context.fillRect(0, 0, canvas.width, canvas.height);
		});

	$('<input type="button" data-inline="true" value="' + s.cancelText + '"/>')
		.appendTo($butt)
		.click(function () {
			Tablet.end();
			$popup.popup('destroy');
		});

	$butt.find('button').button();


	$popup.popup({
		dismissible: false
	}).popup('open');
}

function startTablet(s, context, $sigCont){
	var tabletOpt = {
		ctx: context,
		onConnect: function(){
			$('<div id="sig-tabled-connected-msg">Tableta de firma conectada</div>')
				.prependTo($sigCont)
				.css({
					position: "absolute",
					top: 40,
					zIndex: 999,
					width: s.width,
					textAlign: "center",
					color: "gray",
					opacity: .5,
					fontSize: 32
				});

			s.onTabletConnected();
		}
	};

	if(s.tabletText)
		tabletOpt.msg = s.tabletText;

	if(s.tabletLogo)
		tabletOpt.logo = s.tabletLogo;

	if(s.okTabletMsg)
		tabletOpt.okMsg = s.okTabletMsg;

	Tablet.start(tabletOpt);
}

})(jQuery);