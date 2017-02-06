/* global google */

$.fn.gTable = function(options){
	var o = $.extend({
		version: 0.6,
		data: {},
		drawOptions: {},
		select: [],
		onload: $.noop
	}, options);
	
	if(o.select && $.isFunction(o.select))
		o.select = [o.select];
	
	this.addClass('gTableNotLoaded').data('gTable', o);
	loadGTables($.loadGTables);
	
	return this;
};

$.loadGTables = function(){
	$('.gTableNotLoaded').removeClass('gTableNotLoaded').each(function(){
		var d = $(this).data('gTable');
		
		d.dt = new google.visualization.DataTable(d.data, d.version);
		d.table = new google.visualization.Table(this);
		
		d.table.draw(d.dt, d.drawOptions);
		
		$.each(d.select, function(){
			google.visualization.events.addListener(d.table, 'select', this);
		});
		
		d.onload.call(this, d.table);
	});
};

var loadGTables = function(callback){
	window.gTableCBs = window.gTableCBs || [];
	callback && window.gTableCBs.push(callback);
	
	if(!window.google){
		if(!window.gJsApiLoading){
			window.gJsApiLoading = true;
			$.getScript("https://www.google.com/jsapi?callback=loadGTables");
		}
		return;
	}
	
	delete(window.gJsApiLoading);
	
	if(!google.visualization){
		if(!window.gTableLoading){
			window.gTableLoading = true;
			google.load('visualization', '1', {packages:['table'], callback: loadGTables});
		}
		return;
	}
	
	delete(window.gTableLoading);
	
	$.each(gTableCBs, function(){this.call();});
	
	delete window.gTableCBs;
};