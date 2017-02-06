(function($){

$.gmap = $.gmap || {};

$.gmap.Autocomplete = function(field, options){
	var self = this,
		$f = this.$f = $(field);
	
	this.sensor = false;
	this.types = [];
	this.onChange = $.noop;
	this.onError = $.noop;
	this.minLength = 2;
	this._contextualClicked;
		
	self.value = {
		type: 'text',
		val: $.trim(self.$f.val())
	};
	
	this.$f.data('value', self.$f.val());
	
	$.extend(this, options);
	
	this.addStyles();
	this.getContextual();
	this.applyVisualFilters();
	
	this.$f.focus(function(){
		self.$contextual.toggle(!!self.$contextual.children().size());
	});
	
	this.$f.change(function(){
		if(self.$contextual.css('display') === 'block'){
			//wait for contextual click
			setTimeout(function(){
				self.$contextual.hide();
				
				if(!self.contextualClicked){
					self.value = {
						type: 'text',
						val: $.trim(self.$f.val())
					};
					
					self.place = null;
					
					self.onChange(self.value.val);
				} else
					self.contextualClicked = false;
			},200);
			return false;
		}
	});
	
	if(euca.googleApiKey){
		this.$f.keyup(function(e){
			if(e.keyCode === 13 || e.which === 13)
				return self.$f.blur();

			//Evitamos teclas de no caracteres
			if(self.$f.data('value') === self.$f.val())
				return;

			self.$f.data('value', self.$f.val());

			self.$contextual.empty();

			self.request();
		});
	}
};

$.gmap.Autocomplete.prototype.processChange = function(){
	var self = this;
	
	this.place = null;

	this.getPlace(function(place){
		self.applyVisualFilters();

		self.onChange(place);
		
		if(place.type === 'street_address')
			return;

		if(place.type === 'route'){
			self.$f.parent().find('.street-number-dummy').remove();

			var $i = $('<input type="text" class="street-number-dummy" placeholder="Nº" style="width:26px"/>')
				.insertAfter(self.$f)
				.focus()
				.change(function(){
					self.$contextual.hide();

					var n = $.trim($(this).val());

					if(n){
						self.$f.width(self.$f.width() + $i[0].clientWidth + 2);
						$(this).remove();

						var address = place.formatted_address.replace(', ', ', ' + n + ', ');

						self.$f.val(address);

						self.geocode(address, function(r){
							if(r.length === 1){
								self.$contextual.hide();
								
								self.value = {
									type: 'geocode',
									val: r[0].toLocation()
								};
								
								self.processChange();
							}
						});
					}
				});

			self.$f.width(self.$f.width() - $i[0].clientWidth - 2);
		}
	});
};

$.gmap.Autocomplete.prototype.getPlace = function(cb){
	if(this.place)
		return cb(this.place);
	
	if(!this.value)
		return cb();
	
	var self = this,
		val = this.value.val;
	
	if(this.value.type === 'autocomplete'){
		var params = {
			language: euca._LANGCODE,
			key: euca.googleApiKey,
			sensor: this.sensor,
			reference: val.reference
		};
		
		$.ajax({
			url: '/proxy.php',
			data: {url: 'https://maps.googleapis.com/maps/api/place/details/json?' + $.param(params)}
		}).done(function(r){
			if(r.status === 'OK'){
				self.place = new GPlace(r.result).toLocation();
				
				cb(self.place);
			} else
				$.error('autocomplete error ' + r.status);
		});
	} else if(this.value.type === 'text' && this.value.val){
		this.geocode(val, cb);
	} else
		cb(val);
};

$.gmap.Autocomplete.prototype.processResults = function(r){
	var $c = this.$contextual,
		self = this;
	
	if(r.status !== 'OK'){
		$c.hide();
		return;// $.error(r.status);
	}
	
	$.each(r.predictions, function(){
		if($.inArray('route', this.types) === -1)
			return;
		
		if(self.componentRestrictions && self.componentRestrictions.locality && this.description.indexOf(self.componentRestrictions.locality) === -1)
			return;
		
		var prediction = new $.gmap.Prediction(this);
	
		$('<div class="pac-item">' + prediction + '</div>')
			.appendTo($c)
			.data('value', prediction);
	});

	var size = $c.children().size();
	
	if(size)
		$c.show();
	
	return size;
};

$.gmap.Autocomplete.prototype.getContextual = function(){
	if(!this.$contextual){
		var self = this;
		
		this.$contextual = $('<div class="autocomplete-contextual"></div>')
			.appendTo('body')
			.position({
				of: this.$f,
				my: 'left top',
				at: 'left bottom'
			})
			.hide();
		
		this.$contextual.on('click', '.pac-item', function(){
			self.contextualClicked = true;
			
			var geocoded = $(this).hasClass('geocoded');
			
			self.value = {
				type: geocoded ? 'location' : 'autocomplete',
				val: $(this).data('value')
			};
			
			if(geocoded){
				self.place = self.value.val;
				self.$f.val(self.place.formatted_address);
			} else {
				self.place = null;
				self.$f.val(self.value.val.description);
			}
			
			self.$contextual.empty().hide();
			
			self.processChange();
		});
	}
	
	return this.$contextual;
};

$.gmap.Autocomplete.prototype.getParams = function(){
	if(!this.params){
		this.params = {
			sensor: this.sensor,
			key: euca.googleApiKey,
			language: euca._LANGCODE
		};
	
		if(this.types.length)
			this.params.types = encodeURIComponent(this.types);
		
		if(this.componentRestrictions && this.componentRestrictions.country){
			this.params.components = 'country:' + this.componentRestrictions.country;
		}
		
		if(this.radius && this.location){
			this.params.radius = this.radius;
			this.params.location = this.location.toUrlValue();
		}
	}

	this.params.input = $.trim(this.$f.val());
	
	return this.params;
};

$.gmap.Autocomplete.prototype.request = function(){
	this.getParams();
	
	if(!this.params.input || this.params.input.length < this.minLength)
		return;
	
	var self = this;
		
	$.ajax({
		url: '/proxy.php',
		data: {url: 'https://maps.googleapis.com/maps/api/place/autocomplete/json?' + $.param(this.params)}
	}).done(function(a){
		if(self.processResults(a))
			return;
			
		self.geocode(self.params.input, function(r){
			
		});
	});
};

$.gmap.Autocomplete.prototype.geocode = function(address, cb){
	var self = this;
	
	var geoParams = {
		address: address,
		componentRestrictions: self.componentRestrictions,
		bounds: self.bounds
	};

	if(self.componentRestrictions.country)
		geoParams.region = self.componentRestrictions.country;

	$.gmap.geocode(geoParams, function(results, status){
		if(status === google.maps.GeocoderStatus.OK){
			var routes = [];

			$.each(results, function(){
				if($.inArray('route', this.types) !== -1  || $.inArray('street_address', this.types) !== -1)
					routes.push(new GLocation(this));
			});

			if(routes.length === 0)
				cb(address);
			else {
				self.$contextual.empty().show();

				self.$f.one('focus', function(){
					self.$contextual.hide();
				});

				$.each(routes, function(){
					var address = this.formatted_address;

					$.each(address.split(' '), function(){
						address = address.replace(this, '<b>' + this + '</b>');
					});

					$('<div class="pac-item geocoded">' + this.formatted_address + '</div>')
						.appendTo(self.$contextual)
						.data('value', this.toLocation());
				});
				
				cb(routes);
			}
		} else
			cb(address);
	});
};

$.gmap.Autocomplete.prototype.addStyles = function(){
	if($('#gmap-autocomplete').size())
		return;
	
	$("<style id='gmap-autocomplete' type='text/css'>\
		.autocomplete-contextual{\
			position: absolute;\
			background-color: #FFFFFF;\
			border: 1px solid #CCCCCC;\
			overflow: hidden;\
			font-size: 0.8em;\
			display: none;\
		}\
		.autocomplete-contextual .pac-item{\
			cursor: pointer;\
			padding: 0 4px;\
			text-overflow: ellipsis;\
			white-space: nowrap;\
		}\
		.autocomplete-contextual .pac-item:hover{\
			background-color: #CCCCCC;\
		}\
		</style>").appendTo("head");
};

$.gmap.Autocomplete.prototype.applyVisualFilters = function(){
	var $f = this.$f,
		address = $f.val();

	if(!address)
		return;
	
	for(var i in this.visualFilters)
		address = address.replace(this.visualFilters[i], '');

	setTimeout(function(){$f.val(address);},1);
};



$.gmap.Prediction = function(data){
	$.extend(this, data);
};

$.gmap.Prediction.prototype.toString = function(){
	var re = '^',
		repl = '',
		last = 0,
		i = 1,
		d = this.description;

	$.each(this.matched_substrings, function(){
		if(this.offset > last){
			re += '(\.{' + (this.offset - last -1) + '})';
			repl += '$' + i;
			i++;
		}

		re += '(\.{' + this.length + '})';
		repl += '<b>$' + i + '</b>';

		last = this.offset + this.length -1;
		i++;
	});

	if(last < d.length -1){
		re += '(\.+)';
		repl += '$' + i;
	}

	re += '$';
	
	return d.replace(new RegExp(re), repl);
};


	
})(jQuery);