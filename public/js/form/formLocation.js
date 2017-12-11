/* global google */

(function($){


function locVal2Txt(v){
	var ret = v.formatted_address || '';

	if(!ret)
		return '<i>(' + $.lang('empty') + ')</i>';

	if(v.floor)
		ret += '<br/>' + v.floor;

	if(v.geometry){
		var loc = v.geometry.location;
		ret += '<br/>Lat: ' + loc.lat + '. Lng: ' + loc.lng;
	}

	return ret;
}

var methods = {
	init: function(options){
		var o = $.extend({
			value: {},
			name: 'location',
			caption: null,
			width: 280,
			mapWidth: 340,
			mapHeight: 250,
			floorWidth: 180,
			componentRestrictions: {},//{country: 'ES', locality: 'Barcelona'},
			radius: null,//meters
			radiusLocation: null,//object => {lat,lng}
			visualFilters: [],
			onLoad: $.noop,
			onChange: $.noop,
			onError: $.noop
		}, options);

		if(!$.isPlainObject(o.value))
			o.value = {};

		o.value = new EucaLocation(o.value);

		var $me = this.data('formLocation', o),
			v = o.value;

		v.formatted_address = v.formatted_address || '';
		v.floor = v.floor || '';

		$.gmap.load().done(function(){
			$me.each(function(){
				var me = this;

				var $address = $('<input name="' + o.name + '[formatted_address]" value="' + v.formatted_address + '" style="width:' + o.width + 'px"/>').appendTo(this),
					$msg = $('<div></div>').appendTo(this),
					$map = $('<div></div>').appendTo(this).width(o.mapWidth).height(o.mapHeight).hide(),
					$value = $('<input name="' + o.name + '[value]" type="hidden"/>').appendTo(this);

				o.$map = $map;
				o.$address = $address;

				if(o.caption !== null)
					$address.attr('placeholder', o.caption);

				$value.val(JSON.stringify(v));

				$('<input name="' + o.name + '[floor]" value="' + v.floor + '" style="width:' + o.floorWidth + 'px" placeholder="' + $.lang('_SUB_ADDRESS') + '"/></label>')
					.insertAfter($address).change(function(){
						o.value.floor = $.trim(this.value);

						if(o.value.formatted_address)
							o.onChange.call(me, o.value);
					});

				var acOptions = {
					types: ['geocode'],
					visualFilters: o.visualFilters,
					componentRestrictions: o.componentRestrictions
				};

				if(o.radius && o.radiusLocation){
					acOptions.location = new google.maps.LatLng(o.radiusLocation.lat, o.radiusLocation.lng);
					acOptions.radius = o.radius;
					acOptions.bounds = new google.maps.Circle({radius: o.radius, center: acOptions.location}).getBounds();
				}

				var autocomplete = new google.maps.places.Autocomplete($address[0], acOptions);

				google.maps.event.addListener(autocomplete, 'place_changed', function(){
					var r = autocomplete.getPlace();

					o.value = new EucaLocation(r.geometry ? r : {formatted_addres: r});
					o.value.floor = $me.find('input[name="' + o.name + '[floor]"]').val();

					$(me).data('location', o.value);

					if(r.geometry){
						r.geometry.location = {
							lat: r.geometry.location.lat(),
							lng: r.geometry.location.lng()
						};
					}

					o.onChange.call(me, o.value);

					if(!r.geometry)
						return $map.hide();

					var params = {
						lat: r.geometry.location.lat,
						lng: r.geometry.location.lng,
						error: function(e){
							$map.hide();
							$msg.text(e);
						}
					};

					$value.val(JSON.stringify(o.value));

					$map.show().gMap(params);
				});

				if(v.geometry && v.geometry.location){
					var loc = v.geometry.location;

					$map.show().gMap({
						lat: loc.lat,
						lng: loc.lng
					});
				} else if(v.formatted_address)
					$map.show().gMap({address: v.formatted_address});

				$map.bind('geocode', function(){
					var g = $map.data('gMap').lastGeo;

					if(g.status === google.maps.GeocoderStatus.OK){
						var r = g.results[0];
						$msg.empty();
						$address.val(r.formatted_address);
					} else {
						$map.hide();
						$msg.text(g.status);
					}

					$value.val(JSON.stringify(o.value));
				});

				o.onLoad.call(this);
			});
		});

		return this;
	},
	value: function(){
		return this.data('formLocation').value;
	},
	geocode: function(cb){
		var $me = this,
			o = this.data('formLocation');

		$.gmap.geocode({address: this.find('[name="' + o.name + '[formatted_address]"]').val()}, function(results, status) {
			if(status === google.maps.GeocoderStatus.OK){
				o.$map.gMap('setCenter', {latLng: results[0].geometry.location, setMarker: true});
				cb.call($me, results);
			} else
				cb.call($me, {error: status});
		});
	}
};


$.fn.formLocation = function(method){
	if ( methods[method] ) {
	  return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
	} else if ( typeof method === 'object' || ! method ) {
	  return methods.init.apply( this, arguments );
	} else {
	  $.error( 'Method ' +  method + ' does not exist on jQuery.formLocation' );
	  return this;
	}
};

$.fn.iFormLocation = function(options){
	var o = $.extend({
		value: {},
		name: 'location'
	}, options);

	if(!$.isPlainObject(o.value))
		o.value = {};

	return this.each(function(){
		var $valueText = $('<span>' + locVal2Txt(o.value) + '</span>').appendTo(this),
			$me = $(this).append(' ');

		$valueText.editIconAfter(function($a){
			$valueText.hide();
			var $fl = $('<form/>').insertAfter($(this)).formLocation(o).on('change submit', function(){
				$(this).remove();
				$a.show();
				$valueText.show();

				var r = $.parseJSON($fl.find('[name="' + o.name + '\[value\]"]').val());
				r.floor = $fl.find('[name="' + o.name + '\[floor\]"]').val();

				if(o.value.formatted_address === r.formatted_address && o.value.floor === r.floor)
					return;

				o.value = r;
				$valueText.html(locVal2Txt(o.value));

				o.onChange.call($me[0], o.value);
			});
			$('<input type="submit" value="' + $.lang('_DONE') + '"</input>').appendTo($fl);
		});
	});
};

})(jQuery);