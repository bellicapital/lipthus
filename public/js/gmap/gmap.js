/* global google, euca */

(function($){
	$.gmap = $.gmap || {};
	
	$.gmap.load = function(options){
		var o = $.extend({
			version: 3,
			language: euca._LANGCODE,
			sensor: false,
			libraries: 'places'
		}, options);

		var promise;

		if( promise ) { return promise; }

			//Create a Deferred Object
		var	deferred = $.Deferred();
		var resolve = function () {
			deferred.resolve(window.google && google.maps ? google.maps : false);
		};
		var params = {
			sensor: o.sensor,
			libraries: o.libraries,
			language: o.language,
			key: euca.googleApiKey
		};

		//If google.maps exists, then Google Maps API was probably loaded with the <script> tag
		if(window.google && google.maps)
			resolve();

		//If the google.load method exists, lets load the Google Maps API in Async.
		else if(window.google && google.load)
			google.load("maps", o.version || 3, {"other_params": $.param(params) , "callback" : resolve});

		//Last, try pure jQuery Ajax technique to load the Google Maps API in Async.
		else {
			var now = $.now();
			var callbackName = "loadGoogleMaps_" + ( ++now );

			//Ajax URL params
			params = $.extend( params, {
				'v': o.version,
				'callback': callbackName
			});

			//Declare the global callback
			window[callbackName] = function(){
				resolve();

				//Delete callback
				setTimeout(function() {
					try{
						delete window[callbackName];
					} catch(e){}
				}, 20);
			};

			//Can't use the jXHR promise because 'script' doesn't support 'callback=?'
			$.ajax({
				dataType: 'script',
				data: params,
				url: 'https://maps.googleapis.com/maps/api/js'
			});

		}

		promise = deferred.promise();

		return promise;
	};
	
	$.gmap.geocode = function(options, cb){
		var o = $.extend({
			language: euca._LANGCODE
		}, options);
		
		if(!$.gmap.geocoder)
			$.gmap.geocoder = new google.maps.Geocoder();
		
		$.gmap.geocoder.geocode(o, cb);
	};

	var methods = {
		init: function(options){
			var o = $.extend({
				address: null,
				lat: euca.userLocation ? euca.userLocation.latitude : null,
				lng: euca.userLocation ? euca.userLocation.longitude : null,
				zoom: 15,
				type: 'ROADMAP', // Posible options: ROADMAP, SATELLITE, HYBRID, TERRAIN
				showMarker: true,
				infoWindow: null,
				lang: euca._LANGCODE,
				complete: $.noop,
				error: $.noop
			}, options);

			this.addClass('gMap').each(function(){
				var $me = $(this);
				var ds = this.dataset;
				var width = ds.width || $me.width() || 400;
				var height = ds.height || o.height || $me.height() || $me.width() || 300;

				$me.width(width).height(height);
			});

			var $me = this.each(function(){
				$(this).data('gMap', $.extend({}, o));
			});

			$.gmap.load({language: o.lang}).done(function(){
				$me.gMap('_display');
			});

			return this;
		},
		toLatLng: function(latlng){},
		destroy: function(){},
		_display: function(){
			return this.each(function(){
				var $me = $(this);
				var ds = this.dataset;
				var o = $me.data('gMap');
				var lat = ds.lat || o.lat;
				var lng = ds.lng || o.lng;

				o.map = new google.maps.Map(this, {
					zoom: o.zoom,
					//center: new google.maps.LatLng(lat, lng),
					mapTypeId: google.maps.MapTypeId[o.type]
				});
				if(lat && lng){
					$me.gMap('setCenter', {latLng: new google.maps.LatLng(lat, lng)});
					o.complete.call($me, o);
				} else if(o.address){
					$me.gMap('geocode', {address: o.address, complete: o.complete, error: o.error});
				} else if(navigator.geolocation){
					navigator.geolocation.getCurrentPosition(function(r){
						o.map.setCenter(new google.maps.LatLng(r.coords.latitude, r.coords.longitude));
						o.complete.call($me, o);
					});
					
				} else
					o.complete.call($me, o);
			});
		},
		geocode: function(opt){
			opt = $.extend({
				setMarker: true,
				complete: $.noop,
				error: $.noop
			}, opt);

			if(!opt.address)
				return this;
			
			return this.each(function(){
				var $me = $(this),
					o = $me.data('gMap');

				o.address = opt.address;

				$.gmap.geocode({address: o.address}, function(results, status) {
					o.lastGeo = {address: o.address, results: results, status: status};
					$me.trigger('geocode');
					if(status === google.maps.GeocoderStatus.OK){
						$me.gMap('setCenter', {latLng: results[0].geometry.location, setMarker: opt.setMarker});
						opt.complete(results);
					} else
						opt.error(status);
				});
			});
		},
		setCenter: function(opt){
			return this.each(function(){
				if(!opt.latLng)
					return;

				var $me = $(this),
					o = $me.data('gMap');

				o.lat = opt.latLng.lat();
				o.lng = opt.latLng.lng();

				o.map.setCenter(opt.latLng);

				o.showMarker && $me.gMap('setMarker', opt);
			});
		},
		setMarker: function(opt){
			return this.each(function(){
				if(!opt.latLng)
					return;

				var $me = $(this),
					o = $me.data('gMap');

				if(o.marker){
					o.marker.setPosition(opt.latLng);
				} else {
					o.marker = new google.maps.Marker({
						map: o.map,
						position: opt.latLng
					});
					if(o.infoWindow){
						o.infoWindow = new google.maps.InfoWindow({content: o.infoWindow});
						google.maps.event.addListener(o.marker, 'click', function() {
							o.infoWindow.open(o.map, o.marker);
						});
					}
				}
			});
		}
	};
	
	$.fn.gMap = function(method){
		if(!this.size())
			return this;
		
		if ( methods[method] ) {
		  return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
		  return methods.init.apply( this, arguments );
		} else {
		  $.error( 'Method ' +  method + ' does not exist on jQuery.gMap' );
		  return this;
		}
	};
	
	$(function(){
		$('[data-role="gMap"]').gMap();
	});

})(jQuery);