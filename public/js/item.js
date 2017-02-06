/* global euca */
(function($){

function Item(handler, vars, other){
	this.handler = typeof(handler) === 'string' ? new Handler({colname: handler}) : handler;
	this.loaded = !!vars;
	this.vars = $.extend(true, {}, handler.vars);
	vars && this.setVars(vars);
	other && $.extend(this, other);
}

window.Item  = Item;

Item.get = function(handler, id){
	var ret = new Item(handler);
	ret.id = id;
	return ret;
};

var itp = Item.prototype;

itp.getVar = function(name){
	return this.vars[name] ? this.vars[name].value : null;
};
itp.setVar = function(name, value){
	if(!this.vars[name]) this.vars[name] = {};
	return this.vars[name].value = value;
};
itp.setVars = function(arr){
	var me = this;
	$.each(arr, function(k,v){
		me.setVar(k, v);
	});
};
itp.get = function(callback){
	var me = this,
		data = {s: this.handler.colname};

	if(this.id){
		data.m = 'getVars4Edit';
		data.id = this.id;
	} else
		data.m = 'getCleanVars4Edit';

	$.ajax({
		data: data,
		success: function(d){
			if(d.id || !me.id){
				$.extend(me, d);
				me.loaded = true;
				callback && callback(true);
			} else if(d.errno === 1){
				callback && callback(false, d.errmsg);
			} else
				$.alert('Respuesta inesperada del servidor');
		}
	});
};

itp.copyOrAddToParent = function(curparentcol, newparentcol, curparentid, newparentid, copy, callback){
	var me = this
	,	data = {
			s: me.handler.colname,
			id: this.id,
			a: ['dynobjects.' + newparentcol, newparentid]
		};
		
	if(copy || !curparentcol){
		data.m = 'addParent';
	} else {
		data.m = 'changeParent';
		
		data.a.push('dynobjects.' + curparentcol, curparentid);
	}
	
	$.ajax({
		data: data,
		type: 'POST',
		success: function(ret){
			callback && callback(ret);
		}
	});
};
itp.changeVar = function(name, value, cb){
	if(value.event === 'newFile'){
		this.vars[name].value.push(value.val);
		return cb && cb(true, value.val);
	}
	
	if(value.event === 'sortFiles')
		return this.sortField(name, value.val, cb);
	
	var me = this;
	
	$.ajax({
		data: {
			m: 'changeVar',
			schema: me.handler.colname,
			id: me.id,
			a: $.args(name, value)
		},
		type: 'POST'
	}).done(function(ret){
		if(ret && ret.status){
			switch(value.event){
				case 'deleteFile':
					delete me.vars[name].value[value.val];
					cb && cb(true);
					return;
				case 'setDescription':
					me.vars[name].value[value.val.key].description[value.val.lang] = value.val.text;
					cb && cb(true);
					return;
				case 'sortFiles':
					cb && cb(true);
					return;
				default:
					me.setVar(name, ret.value);
			}
		} else
			alert(ret && ret.error || 'Error. El servidor ha respondido: "' + (ret || '<i>(' + $.lang('empty') + ')</i>') + '"', 'error');
		
		cb && cb(ret && ret.status, me.vars[name].value);
	});
};
itp.sortField = function(key, val, cb){
	var keys = []
	,	newval = []
	,	varobj = this.vars[key]
	,	curval = varobj.value;
	
	val.forEach(function(idx){
		keys.push(curval[idx].key);
		newval.push(curval[idx]);
	});
	
	$.ajax({
		url: '/form/' + this.handler.colname + '/' + this.id + '/sortfield',
		data: {
			name: key,
			keys: keys
		},
		type: 'POST'
	}).done(function(ret){
		if(ret === true)
			varobj.value = newval;
		
		cb && cb(ret, val);
	});
};

itp.showForm = function(options){
	var me = this;
	
	if(!this.loaded){
		if(!options.container){
			var $loading = $('<div class="loading_center"></div>').appendTo('body').dialog({
				modal: true,
				title: $.lang('_FETCHING')
			});
		}
		
		this.get(function(success, error){
			options.container || $loading.dialog('destroy').remove();
			
			if(error)
				$.alert(error);
			else
				me.showForm(options);
		});
		
		return;
	}
	
	var o = $.extend({
		onSubmit: $.noop,
		onFieldChange: $.noop,
		onLoad: $.noop,
		container: null
	}, options);

	var formOptions = {
		vars: this.vars,
		requiredOr: this.requiredOr || [],
		close: o.close || o.onSubmit
	};
	
	if(this.id){
		var desc = '';
		
		if(this.created){
			desc += $.lang('_CREATED') + ': ';
			
			if(this.submitter)
				desc += this.submitter + ' - ';
			
			desc += this.created;
		}
		
		if(this.modified){
			if(desc)
				desc += '<br/>';
			
			desc += $.lang('_MODIFIED') + ': ';

			if(this.modifier)
				desc += this.modifier + ' - ';
			
			desc += this.modified;
		}
		
		$.extend(formOptions, {
			title: o.title ? o.title : (this.handler.title ? this.handler.title[euca._LANGCODE] : ''),
			handler: me.handler.colname,
			colname: 'dynobjects.' + me.handler.colname,
			id: this.id,
			description: desc,
			onValueChange: function(name, val, callback){
//				console.log('item val received.' , 'name: ' + name, val, callback);
				me.changeVar(name, val, function(a,b){
					o.onFieldChange(name, b);
					callback && callback(a,b);
				});
			}
		});

		if(o.container)
			$(o.container).iForm(formOptions);
		else
			$.dialog_iForm(formOptions);
	} else {
		$.extend(formOptions, {
			title: ('Crear ' + this.handler.getTitle()),
			onSubmit: function(data){
				$(this).addClass('loading');
				var form = this;
				$.ajax({
					data: {
						s: me.handler.colname,
						m: 'create',
						a: $.args(data)
					},
					type: 'POST',
					dataType: 'json',
					success: function(d){
						if(d && d._id){
							me.id = d._id;
							$.each(d, function(k, v){me.setVar(k, v);});
							me.loaded = true;
							$(form).remove();
							o.onSubmit.call(me);
						} else
							$.alert('Error del servidor<br/>'+(d.errors ? d.errors.join('<br/>') : JSON.stringify(d, null, '\t')));
					}
				});
				return false;
			},
			onValueChange: function(name, val, callback){
//				console.trace();
//				l('item val received.' , 'name: ' + name, val, callback);
			},
			onError: function(errorMsg){$.alert(errorMsg);},
			showCancelButton: false
		});
		
		$('<form>').appendTo(o.container).form(formOptions);
	}
	o.onLoad();
};

itp.summary = function(container){
	var me = this;
	if(!this.loaded){
		this.get(function(){
			me.summary(container);
		});
		return;
	}
	container.empty();
	var $table = $('<table></table>').appendTo(container);
	$.each(me.vars, function(name, val){
		if(!val.caption) return;
		$table.append('<tr><td class="formcaption">' + val.caption + '</td><td class="formfield"></td></tr>');
		var value = me.getVar(name);
		if(val.formtype === 'yesno'){
			value = value ? $.lang('_YES') : $.lang('_NO');
		}
		if(val.formtype === 'image'){
			value.length && $table.find('td:last').appendThumb({
				src: "/images/"+me.handler.colname+"/"+me.id+"/"+name+"/"+value[0].name,
				thumbMaxWidth: 80,
				thumbMaxHeight: 60,
				imgWidth: value[0].width,
				imgHeight: value[0].height
			});
		} else {
			$table.find('td:last').append(value);
		}
	});
};

})(jQuery);