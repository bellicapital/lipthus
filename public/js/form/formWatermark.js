(function( $ ){

$.fn.iFormWatermark = function(options){
	var $toShow = $('<span></span>').appendTo(this),
		$me = $(this),
		o = $.extend({
			panelized: false
		}, options);
	
	o.value = o.value || {};
	
	if(o.value.text)
		$toShow.text(o.value.text);
	else if(o.value.image)
		$toShow.append('<img src="/bdi/');
	else
		$toShow.append('<i>(' + $.lang('empty') + ')</i>');
	
	$('<a href="javascript:;" style="margin-left: 6px;">' + $.lang('_EDIT') + '</a>').appendTo(this).click(function(){
		$toShow.add(this).hide();
		
		$('<div>').appendTo($me).formWatermark(o);
		
		return false;
	});
};

$.fn.formWatermark = function(options){l(options)
	var o = $.extend({
		title: 'Watermark',
		colname: null,
		itemid: null,
		name: '',
		panelized: false,
		onValueChange: function (name, val, cb){
			v[name] = val;
			$.ajax({
				url: '/form/' + o.colname + '/' + o.itemid + '/set',
				data: {name: o.name + '.' + name, value: val},
				type: 'POST',
				success: function(d){
					if(d.error){
						$.error(d.error);
						alert(d.error);
					}

					cb && cb.call(this, d);
				}
			});
		}
	}, options);
	
	var v = o.value || {type: 0},
		$me = this.width(376),
		$c = $('<h3>' + o.title + '</h3><div></div>').appendTo(this).filter('div'),
		$form = $('<div></div>').appendTo($c),
		vars = {
		text: {
			formtype: 'text',
			name: 'text',
			caption: 'Texto',
			value: v.text || ''
		},
		image: {
			formtype: 'bdi',
			name: 'image',
			caption: '_IMAGE',
			value: v.image || '',
			handler: o.colname,
			itemid: o.itemid,
			field: o.name + '.image'
		},
		color: {
			formtype: 'text',
			name: 'color',
			caption: 'color',
			value: v.color || ''
		},
		fontsize: {
			formtype: 'text',
			name: 'fontsize',
			caption: 'font-size',
			value: v.fontsize
		},
		opacity: {
			formtype: 'number',
			name: 'opacity',
			caption: 'Opacidad',
			value: v.opacity || .8
		},
		gravity:{
			formtype: 'select',
			name: 'gravity',
			caption: 'Posici&oacute;n',
			options: {
				NorthWest: 'Arriba a la izquierda',
				North: 'Arriba',
				NorthEast: 'Arriba a la derecha',
				West: 'Izquierda',
				Center: 'Centro',
				East: 'Derecha',
				SouthWest: 'Abajo a la izquierda',
				South: 'Abajo',
				SouthEast: 'Abajo a la derecha'
			},
			value: v.gravity
		},
		geometry: {
			formtype: 'text',
			name: 'geometry',
			caption: 'Geometría',
			value: v.geometry
		}
	};
	$('<div><label><input type="radio" checked="checked" value="0" name="type">Ninguna</label><label>\n\
		<input type="radio" value="1" name="type">Texto</label>\n\
		<label><input type="radio" value="2" name="type">Imagen</label></div>').prependTo($c).find('input').click(function(){
		$form.empty();
		var fVars, val = parseInt(this.value);
		if(val !== v.type){
			v.type = val;
			o.onValueChange('type', v.type);
		}
		if(v.type === 1)
			fVars = {
				text: vars.text,
				fontsize: vars.fontsize,
				color: vars.color,
				opacity: vars.opacity,
				gravity: vars.gravity
			};
		else if(v.type === 2)
			fVars = {
				image: vars.image,
				opacity: vars.opacity,
				gravity: vars.gravity,
				geometry: vars.geometry
			};

		$form.iForm({
			vars: fVars,
			onValueChange: o.onValueChange
		});
	}).filter('[value="' + v.type + '"]').click();

	$me.find('h3').disableSelection();
	
	return o.panelized ? this.panel({collapsed: !v.type}) : this;
};

})( jQuery );