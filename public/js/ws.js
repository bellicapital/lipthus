(function($){
	
var sockets = {};
var states = {
	CONNECTING: 0,//	The connection is not yet open.
	OPEN: 1,//	The connection is open and ready to communicate.
	CLOSING: 2,//	The connection is in the process of closing.
	CLOSED: 3 //	The connection is closed or couldn't be opened.
};

function WS(url, o){
	this.url = url;
	
	/* in seconds */
	this.retryTimeout = 10;
	
	$.extend(this, o);
	
	var self = this;
	
	Object.defineProperties(this, {
		readyState: {get: function(){return self.conn.readyState;}}
	});
	
	this.restoreTimeout();
	this.open();
	
	this.$ = $(this);
}

WS.prototype.on = function(key, a){
	this.$.on(key, a);
	
	return this;
};

WS.prototype.emit = function(key, a){
	this.$.trigger(key, a);
	
	return this;
};

WS.prototype.open = function(){
	if(!!this.conn && this.conn.readyState !== states.CLOSED)
		return this;

	this.conn = new WebSocket(this.url);
	
	var self = this;
	
	this.conn.onmessage = function(m){
		if(m === 'ping')
			return this.conn.send('pong');
		
		self._onmessage(m);
	};
	
	this.conn.onopen = function(){
		self.onopen && self.onopen(self);
		self.emit('open');
		self.restoreTimeout();
	};
	
	this.conn.onerror = function(e){
		self.emit('error', e);
	};
	
	this.conn.onclose = function(){
		self.emit('close');
		self.onclose && self.onclose();
		
		if(!self.retryTimeout)
			return;
		
		console.warn('Connection closed. Retry in ' + self._retryTimeout + ' seconds...');
		
		setTimeout(self.open.bind(self), self._retryTimeout * 1000);
		
		self._retryTimeout += 2;
	};
	
	return this;
};

WS.prototype.isOpen = function(){
	return !!this.conn && this.conn.readyState === states.OPEN;
};

WS.prototype.send = function(msg){
	//tmp solution
	var c = this.conn
	,	ms = this.isOpen() ? 0 : 5000;
	
	setTimeout(function(){
		c.send(JSON.stringify(msg));
	}, ms);
};

WS.prototype.restoreTimeout = function(){
	this._retryTimeout = this.retryTimeout;
};

WS.prototype._onmessage = function(m){
	m = m.data;
	
	console.info(m, new Date());
	
	try {
		m = JSON.parse(m);
	} catch(e){}
	
	this.emit('message', m);

	this.onmessage && this.onmessage.call(this, m);
};

window.wSocket = function(options){
	if(!options){
		$.each(sockets, function(){
			this.open();
		});
		
		return;
	}
	
	if(typeof options === 'string')
		options = {path: options};
	
	var o = $.extend({
		host: location.host,
		path: location.pathname,
		unique: true,
		protocol: location.protocol === 'https:' ? 'wss' : 'ws'
	}, options);

	var url = o.protocol + '://' + o.host + o.path;
	
	if(sockets[url]){
		if(sockets[url].open(o.onopen))
			
		return sockets[url];
	}
	
	if(o.unique){
		Object.keys(sockets).forEach(function(k){
			sockets[k].conn.close();
			delete sockets[k];
		});
	}
	
	sockets[url] = new WS(url);
	
	return sockets[url];
};

})(jQuery);