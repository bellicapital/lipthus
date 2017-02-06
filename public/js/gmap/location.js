/* global EucaLocation, GLocation, GPlace */

(function($){


window.EucaLocation = function(data){
	this.address_components = [];

	$.extend(this, data);

	this.type =  this.types && this.types[0];
};

EucaLocation.prototype.toJson = function(type, short){
	return JSON.parse(JSON.stringify(this));
};

EucaLocation.prototype.getComponent = function(type, short){
	var ret;

	$.each(this.address_components, function(){
		if(this.types[0] === type){
			ret = short ? this.short_name : this.long_name;
			return false;
		}
	});

	return ret;
};

window.GLocation = function(data){
	$.extend(this, data);
};

GLocation.prototype.__proto__ = EucaLocation.prototype;

GLocation.prototype.isType = function(type){
	return $.inArray(type, this.types) !== -1;
};

GLocation.prototype.toLocation = function(){
	var ret = new EucaLocation({
		formatted_address: this.formatted_address,
		type: this.types[0],
		geometry: {location: {
			lat: this.geometry.location.lat(),
			lng: this.geometry.location.lng()
		}},
		address_components: []
	});

	$.each(this.address_components, function(){
		ret.address_components.push({
			short_name: this.short_name,
			long_name: this.long_name,
			type: this.types[0]
		});
	});

	return ret;
};

GLocation.prototype.getComponent = function(type, short){
	var ret;

	$.each(this.address_components, function(){
		if(this.types[0] === type){
			ret = short ? this.short_name : this.long_name;
			return false;
		}
	});

	return ret;
};

window.GPlace = function(data){
	$.extend(this, data);
};

GPlace.prototype.__proto__ = EucaLocation.prototype;

GPlace.prototype.toLocation = function(){
	return new EucaLocation({
		formatted_address: this.formatted_address,
		address_components: this.address_components,
		geometry: this.geometry,
		type: this.types[0]
	});
};

})(jQuery);