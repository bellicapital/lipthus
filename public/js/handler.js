/* global euca */

function Handler(params){
	this.parents = [];
	this.allParents = {};
	this.accept = [];
	$.extend(this, params);
}
Handler.prototype.getTitle = function(){
	return $.safeLang(this.title || this.colname);
};
Handler.prototype.parentsColnames = function(){
	var ret = [];
	this.parents && $.each(this.parents, function(k){
		ret.push(k);
	});
	return ret;
};
Handler.prototype.acceptKeys = function(){
	var ret = [], me = this;
	$.each(this.accept, function(k, v){
		ret.push(v);
	});
	return ret;
};
Handler.prototype.getAllParents = function(){
	var me = this;
	this.allParents = {};
	this.parents && $.each(this.parents, function(){
		me.allParents[this.colname] = this;
		$.extend(me.allParents, this.getAllParents());
	});
	return this.allParents;
};
// Devuelve si tiene algún padre obligatorio
Handler.prototype.parentRequired = function(){
	var ret = false;
	var me = this;
	$.each(this.parents, function(){
		if(me.vars[me.parentPidKey(this.id)].required)
			ret = true;
	});
	return ret;
};
Handler.prototype.allAcceptedRecursive = function(){
	var ret = [], me = this;
	function r(hs){
		hs && hs.length && $.each(hs, function(){
			var colname = this.toString();
			$.inArray(colname, ret) === -1 && ret.push(colname);
			$.H.handlers[colname] && ($.inArray(colname, me.accept) === -1) && r($.H.handlers[colname].accept);
		});
	}
	r(this.accept);
	return ret;
};
Handler.prototype.toList = function(){
	var ret = {};
	$.each(this.vars, function(k,v){
		if(v.list)
			ret[k] = v;
	});
	return ret;
};
function Handlers(d){
	this.handlers = {};
	this.handlersById = {};
	this.menus = d.menus;
	$.each(this.menus, function(id,menu){menu.id = id;});
	var me = this;
	$.each(d.handlers, function(k, h){
		me.addHandler(h);
	});
}
Handlers.prototype.addHandler = function(h){
	var me = this;
	this.handlersById[h.id] = this.handlers[h.colname] = new Handler(h);
};
Handlers.prototype.getList = function(idAsKey){
	var ret = {};
	$.each(this.handlers, function(k, h){
		ret[idAsKey ? h.id : k] = h.getTitle();
	});
	return ret;
};

$.fn.drawDetails = function(s){
	var $me = this;
	//Pepe: En menu tengo un array con los ids del handler que NO se deben visualizar
	this.empty().addClass('loading16');
	var data = {
		id: s.itemid,
		schema: s.handler.colname,
		m: 'getValues4Edit'
	};

	if(s.menu.filter && s.menu.filter.length)
		data.a = $.args(s.menu.filter);

	$.ajax({
		data: data
	}).done(function(d){
		$me.removeClass('loading16');

		var it = new Item(s.handler, d.vars, d.info);

		if(euca.user.isAdmin && $.fn.iForm){
			it.showForm({
//					title: $.lang('Type') + ': ' + handler.getTitle(),
				onFieldChange: s.onItemChange,
				container: $('<div class="ui-widget-content ui-corner-all">').appendTo($me)
			});
		} else
			it.summary($('<div>').appendTo($me));
	});
};