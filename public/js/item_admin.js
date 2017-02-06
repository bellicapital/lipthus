(function($){
	

$.fn.iFormHandler = function(handler){

	//Tabla de campos
	var $t = $('<table class="outer"><thead><tr></tr></thead></table>').width('100%').css({
		textAlign: 'center',
		fontSize: '0.8em'
	});
	
	//Parámetros del handler
	this.iForm({
		vars: {
			title: {
				formtype: 'text',
				required: true,
				data_type: 14,
				caption: $.lang('_TITLE'),
				value: handler.title,
				multilang: true
			},
			description: {
				formtype: 'textarea',
				data_type: 14,
				caption: $.lang('_DESCRIPTION'),
				value: handler.description,
				multilang: true
			},
			colname: {
				formtype: 'label',
				caption: $.lang('Directory'),
				value: handler.colname
			},
			parents: {
				formtype: 'label',
				caption: $.lang('Parents'),
				value: $('<div>').parentEditor(handler)
			},
			accept: {
				formtype: 'label',
				caption: $.lang('Accept'),
				value: handler.accept && handler.accept.join(', ') || '<i>('+$.lang('_NONE')+')</i>'
			},
			list_created: {
				formtype: 'boolean',
				caption: 'Fecha de creación en listados',
				value: handler.list_created
			},
			subscriptions: {
				formtype: 'boolean',
				caption: 'Subscriptions',
				value: handler.subscriptions
			},
			fields: {formtype: 'label', caption: $.lang('Fields'), value: $t}
		},
		handler: 'dynobjects',
		id: handler.id,
		onValueChange: function(k, v, callback){
			var obj = {};
			
			obj[k] = v;
			
			$.ajax({
				data: {m: 'findByIdAndUpdateSafe', schema: 'dynobject', a: [handler.id, obj]},
				type: 'post',
				success: function(){
					callback(true);
					handler[k] = v;
					$('body').trigger('handlerChange', [handler]);
				}
			});
		}
	});
	var showDelete = true;
	$.each(handler.accept, function(){
		if(handler !== this)
			return showDelete = false;
		return true;
	});
	showDelete && $('<button>' + $.lang('_DELETE') + '</button>').appendTo(this).button().click(function(){
		var buttons = {};
		buttons[$.lang('_DELETE')] = function(){
			var $me = $(this).empty().addClass('loading_center');
			$.ajax({
				data: {method: 'remove', handler: 'dynobjects', classname: 'dynobjects', id: handler.id},
				type: 'POST',
				success: function(d){
					$me.dialog('close');
					if(d === 1){
						$('#c_'+handler.id).remove();//Elimina el botón
						$('.selmenu label[for="c_' + handler.id + '"]').remove();//... y su etiqueta
						$('#admincontent').find('.iForm').empty();//elimina la visualización del objeto
						delete $.H.handlers[handler.colname];
						//Menu
						$.each($.H.menus, function(menuid, menu){
							if(menu.colname === handler.colname){
								$('[href="admin#lmns|' + menu.id + '"]').parent().remove();//Elimina el botón de LMN's
								delete($.H.menus[menuid]);
							}
						});
					} else msg('Error del servidor<br/>'+(d.errors ? d.errors.join('<br/>') : d), 'error');
				}
			});
		};
		buttons[$.lang('_CANCEL')] = function(){
			$(this).dialog('close');
		};
		var $dialog = $('<div title="Eliminar objeto"></div>')
			.append('<h4>Esta acción eliminará completamente el objeto <b>' + handler.getTitle() + '</b> de la base de datos</h4>');
		var $list = $('<ul style="display:inline-block"><li>Se eliminará la tabla ' + handler.colname + ' con todos sus elemetos</li></ul>')
			.appendTo($dialog);
		$.each(handler.parents, function(){
			$list.append('<li>Se eliminará la tabla ' + this.colname + ' con todos sus elemetos</li>');
		});
		$list.append('<li>Se eliminarán todos los archivos subidos de estos objectos</li>');
		$dialog.dialog({
			resizable: false,
			modal: true,
			width: 480,
			buttons: buttons
		});
	});

	$('<button>Create class file</button>').appendTo(this).button().click(function(){
		$.ajax({
			data: {method: 'createClassFile', classname: 'dynobjects', handler: 'dynobjects', id: handler.id},
			type: 'post',
			success: function(d){

			}
		});
	});

	/* Variables */
	//Parámetros comunes a las variables
	var vars = {
		key: {caption: 'key name', formtype: 'text'},
		"default": {caption: 'default', formtype: 'text'},
		required: {caption: 'required', formtype: 'text'},
		maxlength: {caption: 'max length', formtype: 'text'},
		options: {caption: 'options', formtype: 'text'},
		type: {caption: 'type', formtype: 'selector'},
		multilang: {caption: 'multilang', formtype: 'checkbox'},
		caption: {caption: 'caption', formtype: 'text'},
		list: {caption: 'listado', formtype: 'checkbox'}
	};

	var $trHead = $t.find('tr');
	
	$.each(vars, function(){
		$trHead.append('<th>' + this.caption + '</th>');
	});
	
	$trHead.append('<th>&nbsp;</th>');

	// Link: Adds a new var to the object
	$('<tfoot><tr><td colspan="10"><a href="javascript:;">Añadir variable</a></td></tr></tfoot>').appendTo($t).find('a').click(function(){
		var opt = {
			multilang: 'Texto MultiIdioma',
			text: 'Texto',
			multilangtextarea: 'Área de texto MultiIdioma',
			textarea: 'Área de texto',
			date: 'Fecha',
			datetime: 'Fecha y hora',
			'int': 'Entero',
			url: 'Enlace',
			bolean: 'Sí o no',
			bdi: 'bdi',
			image: 'Imagen',
			video: 'Video',
			user: 'Usuario',
			file: 'Documento',
			array: 'Matriz',
			'float': 'Flotante',
			percent: 'Porcentaje',
			country: 'Pais',
			autoinc: 'Auto increment'
		};
		$.dialogForm({
			title: $.lang('Create') + ' campo',
			langs: false,
			width: 520,
			vars: {
				type: {
					formtype: 'radio',
					options: opt,
					separator: '<br/>',
					caption: 'Tipo de campo',
					required: true
				},
				keyname: {
					formtype: 'text',
					caption: 'key name'
				},
				caption: {
					formtype: 'text',
					caption: $.lang('_TITLE')
				}
			},
			onSubmit: function(d){
				var dialog = this;
				function safeName(n,i){
					if(!handler.vars[n])
						return n;
					if(!handler.vars[n + i])
						return n;
					return safeName(n,++i);
				}
				
				d.caption = safeName(d.caption || d.keyname || opt[d.type], 1);
				d.keyname = safeName(d.keyname || d.type, 1);
				
				$.ajax({
					data: {
						method: 'newField',
						classname: 'dynobjects',
						id: handler.id,
						args: [d.keyname, d.caption, d.type]
					},
					type: 'POST',
					success: function(r){
						if($.isPlainObject(r) && r){
							$(dialog).trigger('close');
							$.extend(handler.vars, r);
							addVar(d.keyname, r[d.keyname]);
						} else
							msg('Error del servidor<br/>' + (r.errors ? r.errors.join('<br/>') : r), 'error');
					}
				});
			}
		});
	});
	var formTypes = ['', 'text', 'textarea', 'yesno', 'radio', 'selector', 'checkboxes', 'user', 'video', 'bdi', 'image', 'file', 'datetime', 'date', 'location'];
	function addVar(k, v){
		if(k === 'id' || k.substr(0,3) === 'pid') return;
		$t.append(
			'<tr>\
				<td>' + k + '</td>\
				<td>' + (v['default'] || '') + '</td>\
				<td><input name="varrequired" type="checkbox" value="' + k + '"' + (v['required'] ? ' checked="checked"' : '') + '/></td>\
				<td>' + (v.maxlength || '&nbsp;') + '</td>\
				<td class="formOptions"></span></td>\
				<td class="formType"></td>' +
				'<td class="formMultilang"></td>' +
				'<td>' + $.lang(v.caption) + '</td>\
				<td><input name="varlist" type="checkbox" value="' + k + '"' + (v.list ? ' checked="checked"' : '') + '/></td>\
				<td>&nbsp;</td>\
			</tr>');
		
		if(v.multilang !== undefined)
			$t.find('td.formMultilang:last').append('<input type="checkbox" name="varmultilang" value="' + k + '"' + (v.multilang ? ' checked="checked"' : '') + '/>');
		
		// Form type editor
		if(v.formtype && $.inArray(v.formtype, formTypes) === -1)
			formTypes.push(v.formtype);
		
		$t.find('td.formType:last').formSelector({name: 'formtype', options: formTypes, value: v.formtype}).find('select').change(function(){
			var val = $(this).val();
			$.DOchangeVarParam(handler.id, k, 'formtype', val, function(d){
				if(d === true)
					handler.vars[k].formtype = val;
			});
		});
		
		// Select options
		var $opt = $t.find('td.formOptions:last');
		var arr = [];
		v.options && $.each(v.options, function(){arr.push(this);});
		//$opt.append('<span>' + arr.join(', ') + '</span>');
		$('<button>' + $.lang('_EDIT') + '</button>').height(18).width(20).appendTo($opt).button({icons: {primary: 'ui-icon-pencil'}, text: false}).click(function(){
			var $d = $('<div title="' + k + ' - options"><form action="javascript:;"><table style="width: 370px"><tr><th>Value</th><th>Name</th><th>&nbsp;</th></tr></table></form></div>');//.css('overflow', 'hidden');
			var $tt = $d.find('table');
			$d.find('form').submit(function(){
				var opt = {};
				$tt.find('tr:gt(0)').each(function(){
					var key = $('input:first', this).val();
					var val = $('input:eq(1)', this).val();
					if(key && val)
						opt[key] = val;
				});

				$.DOchangeVarParam(handler.id, k, 'options', opt, function(d){
					if(d === true){
						handler.vars[k].options = opt;
						var arr = [];
						$.each(opt, function(){arr.push(this);});
						$opt.find('span:first').html(arr.join(', '));
					}
				});
				return false;
			});
			function _addFieldOption(kk, vv){
				var $tr = $('<tr><td><input value="' + kk + '"/></td><td><input value="' + vv + '"/></td><td></td></tr>').appendTo($tt);
				$('<span>' + $.lang('_DELETE') + '</span>')
					.height(18)
					.width(20)
					.appendTo($tt.find('td:last'))
					.button({
						icons: {primary: 'ui-icon-trash'},
						text: false
					})
					.click(function(){
						$tr.remove();
					});
			}
			$('<span>' + $.lang('_CREATE') + '</span>').height(18).width(20).appendTo($d).button({icons: {primary: 'ui-icon-plus'}, text: false}).click(function(){
				_addFieldOption('', '');
			});
			v.options && $.each(v.options, _addFieldOption);
			_addFieldOption('', '');
			var buttons = {};
			buttons[$.lang('_SUBMIT')] = function(){
				$d.find('form').submit();
				$(this).dialog('close');
			};
			buttons[$.lang('_CANCEL')] = function(){
				$(this).dialog('close');
			};
			$d.dialog({
				width: 400,
				buttons: buttons,
				modal: true,
				close: function(){$d.dialog('destroy').remove();}
			});
		});
		// Botón borrar
		$('<button>' + $.lang('_DELETE') + '</button>').height(18).width(20).appendTo($t.find('td:last')).button({icons: {primary: 'ui-icon-trash'}, text: false}).click(function(){
			$(this).blur();
			if(confirm('Esta acción eliminará el campo `' + k +'` de la tabla')){
				$(this).parent().addClass('loading');
				var $row = $(this).parents('tr:first');
				$.ajax({
					data: {
						method: 'deleteField',
						classname: 'dynobjects',
						id: handler.id,
						args: [k]
					},
					type: 'POST',
					success: function(d){
						if(d){
							$row.remove();
							delete handler.vars[k];
						} else msg('Error del servidor', 'error');
					}
				});
			}
		});
	}
	$.each(handler.vars, addVar);

	$('tbody', $t).sortable({
		update: function(e, ui) {
			var tmp = {}, newOrder = [];
			$.each(ui.item.parent().find('tr td:first-child'), function(){
				var key = $(this).text();
				tmp[key] = handler.vars[key];
				newOrder.push(key);
			});
			$.ajax({
				data: {method: 'sortVars', classname: 'dynobjects', id: handler.id, args: [newOrder]},
				type: 'POST',
				success: function(d){
					if(d)
						handler.vars = tmp;
					else
						msg(d, 'error');
				}
			});
		},
		containment: 'parent',
		cursor: 'move'
	});
	$t.on('click', 'input[name=varlist], input[name=varrequired], input[name=varmultilang]', function(){
		var input = this, param = input.name.substr(3);
		$.DOchangeVarParam(handler.id, this.value, param, this.checked, function(d){
			if(d === true)
				handler.vars[input.value][param] = input.checked;
		});
	});
};

$.fn.parentEditor = function(handler){
	var opt = $.H.getList(),
		$me = this,
		val = handler.parentsColnames(),
		//Todo: Use formElement to draw it
		$valueText = $('<span>' + $.optVal2Text(val, opt) + '</span>').appendTo(this);
	$('<a href="javascript:;" style="margin-left: 16px;">' + $.lang('_EDIT') + '</a>').appendTo(this).click(function(){
		$(this).hide();
		$valueText.hide();
		var $t = $me.append('<table class="outer" style="text-align: center"><thead><th>' + $.lang('object') + '</th><th>Requerit</th></thead><tbody></tbody></table>').find('tbody');
		$.each($.H.handlers, function(k, h){
			var checked = $.inArray(k, val) !== -1 ? ' checked="checked"' : '';
			var required = (handler.parents[k] && !handler.parents[k].required) ? '' : ' checked="checked"';
			$t.append('<tr>\
				<td style="text-align: left"><label><input name="parent" type="checkbox" value="' + h.colname + '"' + checked + '/>' + h.getTitle() + '</label></td>\
				<td><input name="required" type="checkbox" value="' + h.colname + '"' + required + '/></td></tr>');
			checked || $t.find('input[name=required]:last').hide();
		});
		$me.find('input[name=parent]').change(function(){
			var data = {
				method: this.checked ? 'addDynParent' : 'removeDynParent',
				classname: 'dynobjects',
				id: handler.id,
				args: [this.value]
			};
			var checkbox = this;
			$.ajax({data: data, type: 'POST', success: function(ret){
				if(ret === true){
					$(checkbox).parents('tr:first').find('input[name=required]').toggle();
					if(checkbox.checked)
						handler.parents[data.parent] = {required: true};
					else
						delete handler.parents[data.parent];
				}
			}});
		});
		$me.find('input[name=required]').change(function(){
			var input = this;
			$.ajax({
				data: {
					method: 'parentRequired',
					classname: 'dynobjects',
					id: handler.id,
					args: [this.value, this.checked]
				},
				type: 'POST',
				success: function(d){
					if(d === true)
						handler.parents[input.value].required = input.checked;
				}
			});
		});
	});
	return this;
};

$.fn.dynObjectsAdmin = function(){
	var $t = this.append('<table><tr><td style="width: 180px;"><form class="selmenu"></form></td><td></td></tr></table>').find('table'),
		$f = $t.find('form'),
		$right = $t.find('td:last').css('text-align', 'left');
	
	$.each($.H.handlers, function(n, h){
		$('<input id="c_' + h.id + '" type="radio" name="handlers" rel="' + n + '"/><label for="c_' + h.id + '">' + h.getTitle() + '</label>')
			.appendTo($f).data('handler', h);
	});
	
	// TODO: avoid multiple binds
	$('body').bind('handlerChange', function(e, h){
		$f.find('input').each(function(){
			if(h === $(this).data('handler'))
				$(this).button('option', 'label', h.getTitle());
		});
	});
	
	$f.append('<hr/>');
	
	$f.append('<input id="newhandler" type="radio" name="handlers"/><label for="newhandler">' + $.lang('Create') + ' ' + $.lang('object') + '</label>');
	
	$f.find('input').button().click(function(){
		$right.empty();
		
		if(this.id !== 'newhandler'){
			var colname = $(this).attr('rel');
			$right.iFormHandler($.H.handlers[colname]);
			window.location.hash = '#config|dynobjects|' + colname;
		} else
			$right.newObject();
	}).filter('[rel="' + location.hash.replace(/#config\|dynobjects\|/,'') + '"]').click();
	
	return this;
};

$.fn.newObject = function(){
	this.append('<h3>Plantillas de objetos</h3><p><i>Selecciona un modelo para crear una nueva página o sección</i></p>'
		+ '<ul>'
		+	'<li class="ui-widget-content"><a href="#forum" onclick="return false">Forum</a></li>'
		+	'<li class="ui-widget-content"><a href="#wiki" onclick="return false">Wiki</a></li>'
		+	'<li class="ui-widget-content"><a href="#standard" onclick="return false">Standard</a></li>'
		+ '</ul>'
	);
	this.find('li').click(function(){
		if(!$(this).find('a').size()){
			$.alert('En preparación...');
			return;
		}
		var title, tpl = $(this).find('a').attr('href').substr(1);
		if(tpl === 'standard')
			title = '';
		else {
			title = tpl.replace(/\b([a-z])/gi,function(c){return c.toUpperCase();});
			while($.H.handlers[title]){
				var last = /_(\d+)$/.exec(title);
				if(last && last.length)
					title = title.replace(/\d+$/, ++last[1]);
				else
					title += '_2';
			}
		}
		$.prompt({
			message: 'Título de la nueva sección',
			value: title,
			complete: function(title){
				title = $.trim(title);
				if(!title) return;
				if($.H.handlers[title]){
					alert('Nombre ya usado');
					return;
				}
				$.ajax({
					data: {
						m: 'createLMN',
						s: 'dynobject',
						a: [title, tpl]
					},
					type: 'POST',
					success: function(d){
						if($.isPlainObject(d) && d.vars){
							$.H.addHandler(d.vars);
							$('a[href="#config|dynobjects"]').click();
							var menu = {
								colname: d.vars.colname,
								title: d.vars.title,
								show_orphans: 1,
								template: tpl
							};
							$.ajax({
								data: {
									method: 'create',
									classname: 'dynobjectsmenu',
									args: [{
										colname: menu.colname,
										url: menu.colname,
										title: menu.title,
										template: menu.template
									}, true]
								},
								type: 'POST',
								success: function(d2){
									$.H.menus[d2.id] = menu;
									$('a[href="admin#config|dynobjects"]').click();
									$('#c_' + d.vars.id).click();
									$('.selmenu input').button('refresh');
								}
							});
						} else {
							$.alert(d.error || d);
						}
					}
				});
			}
		});
	});
	this.find('li').css({margin: 4}).bind('mouseover mouseout', function(){
		$(this).toggleClass('ui-state-hover');
	});
	return this;
};

$.DOchangeVarParam = function(id, _var, param, value, done){
	$.ajax({
		data: {
			method: 'changeVarParam',
			classname: 'dynobjects',
			id: id,
			args: [_var, param, value]
		},
		type: 'POST'
	}).done(done);
	
};

})(jQuery);