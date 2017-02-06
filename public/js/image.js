function EucaImage(d){
	$.extend(this, d);
}

EucaImage.prototype.src = function(w,h,c){
	if(!this.path)
		return this.data || this.fullPath;
	
	var server = '//' + euca.server;
	
	if(!w)
		return server + this.uri;
	
	if(w === true)
		return server + this.path + this.name;
	
	w = w || this.width;
	h = h || this.height;
	c = c ? 'k1' : '';
	
	return server + this.path + w + 'x' + h + c + '/' + this.name;
};

EucaImage.prototype.html = function(w,h,c){
	var ret = '<img src="' + this.src(w,h,c) + '" alt="' + this.name + '"';
	
	if(w || h){
		ret += ' style="';
		
		if(w)
			ret += 'max-width:' + w + 'px;';
		if(h)
			ret += 'max-height:' + h + 'px;';
		
		ret += '"';
	}
	
	return ret + '/>';
};

