/* global euca */

$.fn.adminMenus = function(){
	if(!$.count($.H.handlers)){
		this.html('No hay objetos para crear menús').highlighted();
		return this;
	}
	var $me = this.width(430);
	var $dialog = $('<div style="text-align:center"><p>Selecciona un objeto de referencia<br/><i>(Raíz del menú)</i></p></div>');
	var $nmb = $('<div id="newmenubuttons"></div>').appendTo($dialog);
	$('<button style="float: right;">' + $.lang('Create') + ' Menu</button>').appendTo(this).button().click(function(){
		$(this).removeClass('ui-state-focus');
		$dialog.dialog('open');
	});
	$.each($.H.menus, function(id){
		this.id = id;
		$('<div>').appendTo($me).adminMenu(this);
	});
	$.each($.H.handlers, function(){
		var handler = this;
				
		if(!handler.menu)
			handler.menu = [];
		
		$('<button style="width:100px">' + this.getTitle() + '</button>').appendTo($nmb).button().click(function(){
			$dialog.dialog('close');
			
			var menu = {
				colname: handler.colname,
				title: handler.title
			};
			var data = {
				m: 'submitItem',
				s: 'dynobjectsmenu',
				a: $.args([{colname: menu.colname, title: menu.title}])
			};
			$.ajax({data: data, type: 'POST', success: function(d){
				menu.id = d.id;
				menu.filter = [];
				$('<div>').appendTo($me).adminMenu(menu);
				
				handler.menu.push(menu);
				$.H.menus[d.id] = menu;
			}});
		});
	});
	$dialog.dialog({
		autoOpen: false,
		modal: true,
		width: 300,
		title: "Crear nuevo menu"
	});
	this.droppable({
		accept: '.adminmenu',
		drop: function(e, ui){
			ui.draggable.css({left: 'auto', top: 'auto'});
		}
	});
	return this;
};

$.fn.adminMenu = function(menu){
	var handler = $.H.handlers[menu.colname],
		$me = this.addClass('adminmenu'),
		$c = $('<div></div>').appendTo($me)
			.append('<h3 id="adminmenu_'+handler.colname+'">' +  $.safeLang(menu.title) + '</h3>'),
		$div = $('<div class="ui-helper-reset ui-widget-content ui-panel-content">')
			.appendTo($c)
			.append('<p>' + $.lang('Object') + ' base: ' + handler.getTitle() + '</p>'),
		$table = $('<table style="width:100%"><tr><td></td><td></td></tr></table>').appendTo($div),
		user_side_checked = menu.user_side ? ' checked="checked"' : '',
		show_orphans_checked = menu.show_orphans ? ' checked="checked"' : '';

	/* show orphans */
	$table.find('td:first')
		.append('<div><label><input name="show_orphans" type="checkbox" value="1"' + show_orphans_checked + '/>' + $.lang('Show orphans') + '</label></div>');
	$c.find('input[name=show_orphans]').change(function(){
		var data = {
			m: 'changeVar',
			s: 'dynobjectsmenu',
			id: menu.id,
			a: $.args(['show_orphans', this.checked ? 1 : 0])
		};
		var dom = this;
		$.ajax({data: data, type: 'POST', success: function(d){
			if(d.status){
				menu.show_orphans = d.value;
			} else {
				dom.checked = !dom.checked;
				msg('Respuesta desconocida del servidor', 'error');
			}
		}});
	});

	/* user side */
	$table.find('td:first')
		.append('<div><label><input name="user_side" type="checkbox" value="1"' + user_side_checked + '/>Lado usuario</label></div>')
		.append('<div class="userSide"><span style="float:left">Url:&nbsp;</span><div></div></div>');
	$table.find('.userSide > div').iText({
		formtype: 'url',
		name: 'url',
		value: menu.url,
		width: 150,
		onChange: function(value, cb){
			$.ajax({
				data: {
					m: 'changeVar',
					s: 'dynobjectsmenu',
					id: menu.id,
					a: $.args('url', value)
				},
				type: 'POST',
				success: function(d){
					menu.url = value;
					cb(d);
				}
			});
		}
	});
	$c.find('input[name=user_side]').change(function(){
		var data = {
			m: 'changeVar',
			s: 'dynobjectsmenu',
			id: menu.id,
			a: $.args(['user_side', this.checked ? 1 : 0])
		};
		var dom = this;
		$.ajax({data: data, type: 'POST', success: function(d){
			if(d.status){
				menu.user_side = data.value;
				$me.find('.userSide').toggle();
			} else {
				dom.checked = !dom.checked;
				msg('Respuesta inesperada del servidor' + d, 'error');
			}
		}});
	});

	/* template selector */
	$('<select name="template"><option>cloud</option><option>wiki</option><option>tasks</option></select>')
		.appendTo($table.find('.userSide')).val(menu.template).change(function(){
			var sel = this, data = {
				m: 'changeVar',
				s: 'dynobjectsmenu',
				id: menu.id,
				a: $.args(['template', this.value])
			};
			var dom = this;
			$.ajax({data: data, type: 'POST', success: function(d){
				if(d === 1)
					menu.template = data.value;
				else {
					dom.value = menu.template;
					msg('Respuesta desconocida del servidor', 'error');
				}
			}});
		});
	if(!menu.user_side)
		$c.find('.userSide').hide();

	/* filters */
	if(handler.accept.length){
		$table.find('td:last').append('No mostrar:');
		$.each(handler.allAcceptedRecursive(), function(k, h){
			checked = $.inArray(h, menu.filter) !== -1 ? ' checked="checked"' : '';
			//Pepe: handler.id != h.id -> No listará en el menú a sí mismo
			$table.find('td:last').append('<div><label><input name="hmenu" type="checkbox" value="' + h + '"' + checked + '/>' + $.H.handlers[h].getTitle() + '</label></div>');
		});
		$c.find('input[name=hmenu]').change(function(){
			var data = {
				_s: 'dynobjects',
				m: 'menufilter',
				s: 'dynobjectsmenu',
				id: menu.id,
				val: []
			};
			var dom = this;
			$c.find('input[name=hmenu]').each(function(){
				this.checked && data.val.push(this.value);
			});
			
			$.ajax({data: data, type: 'POST', success: function(d){
				if(d === true)
					menu.filter = data.val;
				else {
					dom.checked = !dom.checked;
					msg('Respuesta desconocida del servidor', 'error');
				}
			}});
		});
	}
	$c.panel({
		collapsible: true,
		//collapsed: true,
		controls: '<span class="ui-panel-rightbox ui-icon ui-icon-pencil" title="' + $.lang('_EDIT') + '"></span>\
			<span class="ui-panel-rightbox ui-icon ui-icon-trash" title="' + $.lang('_DELETE') + '"></span>'
	});
	$me.append('<div class="children"></div>');
	this.find('span.ui-icon-trash').tooltip().click(function(){
		$.ajax({
			data: {
				m: 'remove',
				s: 'dynobjectsmenu',
				id: menu.id
			},
			type: 'POST',
			success: function(ret){
				if(!ret.error){
					delete $.H.menus[menu.id];
					$me.remove();
					$('[href="#menu' + menu.id + '"]').parent().remove();
				} else $.alert('Error. El servidor ha respondido: "' + ret + '"');
			}
		});
		return false;
	});
	this.find('span.ui-icon-pencil').tooltip().click(function(){
		$(this).removeClass('ui-state-focus');
		var $titleEditor = $('<div title="Modificar nombre del menú"></div>');
		var $form = $('<form><table><tbody></tbody></table></form>').appendTo($titleEditor).submit(function(){
			return false;
		});
		var $tb = $form.find('tbody');
		$.each(euca.langs, function(code, name){
			$tb.append('<tr><td>' + ($.count(euca.langs) > 1 ? name : '&nbsp;') + '</td><td><input name="' + code + '" value="' + $.safeLang(menu.title, code) + '"/></td></tr>');
		});
		var buttons = {};
		buttons[$.lang('_SUBMIT')] = function() {
			var value = {};

			$.each($form.find('input'), function(){
				value[this.name] = this.value;
			});

			$.ajax({
				data: {
					m: 'changeVar',
					s: 'dynobjectsmenu',
					id: menu.id,
					a: $.args('title', value)
				},
				type: 'POST',
				success: function(d){
					if(d.status){
						menu.title = d.value;
						$me.find('h3 span.ui-panel-title-text').html($.safeLang(menu.title));
						$('#headerbar').find('a[href=#menu' + menu.id +']').html($.safeLang(menu.title));
					}
				}
			});
			$(this).dialog('close');
		};
		buttons[$.lang('_CANCEL')] = function() {
			$(this).dialog('close');
		};
		$titleEditor.dialog({
			modal: true,
			width: 300,
			buttons: buttons
		});
	});
	this.draggable({
		revert: 'invalid',
		containment: '#admincontent',
		cursor: 'move',
		opacity: 0.8
	});
	this.droppable({
		accept: '.adminmenu',
		activeClass: "ui-state-highlight",
		drop: function(e, ui){
			var $children = $(this).find('.children');
			if(ui.draggable.parent()[0] === $children[0])
				return false;
			else {
				$children .append(ui.draggable.css({left: 'auto', top: 'auto'}));
				return true;
			}
		}
	});
	return this;
};