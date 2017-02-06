/* global google */

$.fn.adminUser = function(){
	var $me = $(this), $table;

	$.ajax({
		data: {schema: 'user', m: 'findAndGetValues4Show', a: ['req']},
		success: _draw
	});
	
	$.timeZoneList();
	
	function _draw(d){
		var captions = {
			id: {type: "string", caption: 'User id'},
			uname: {type: "string", caption: 'uName'},
			name: {type: "string", caption: 'Name'},
			email: {type: "string", caption: 'eMail'},
			phone: {type: "string", caption: 'Phone'},
			url: {type: "string", caption: 'Url'},
			image: {type: "string", caption: 'Avatar'},
			created: {type: "date", caption: 'Data&nbsp;Reg'},
			location: {type:"string",caption:'From'},
			actkey: {type:"string",caption:'Act&nbsp;Key'},
			level: {type: "number", caption: 'Level'},
			timezone_offset: {type: "number", caption: 'TimeZone'},
			last_login: {type: "date", caption: 'Last&nbsp;login'},
			mailok: {type: "boolean", caption: 'MailOk'}
		};

		/* Muestra los parámetros del grupo de usuarios */
		$('<input type="button" value="Nuevo usuario" name="newuser">').appendTo($me).button().click(function(){
			var options = {
				callback: function(data){
					$(this).trigger('close');
					d.push(data);
					$table && $table.remove();
					drawTable();
				}
			};
			$.newUserForm(options);
		});

		$('<div>').appendTo($me).iForm({
			vars: {
				name: {value: name, caption: 'Nombre', formtype: 'text'}
			}
		});
		if(d.length)
			drawTable();

		function drawTable(){
			var dataG;
			
			function addUser(n, v){
				d[n] = v;
				
				dataG.addRow([
					v._id,
					v.uname,
					v.name,
					v.email,
					v.phone.toString(),
					v.url,
					v.image,
					new Date(v.created),
					v.location,
					v.actkey ? v.actkey.toString() : '',
					v.level,
					parseFloat(v.timezone_offset),
					v.last_login ? new Date(v.last_login) : null,
					!!v.mailok,
					'<div style="text-align:center"><span class="iEdit ui-icon ui-icon-pencil"></span><span class="iDelete ui-icon ui-icon-trash"></span></div>'
				]);
			}
			$me.css('padding', '1em 0');
			$table = $('<div>').appendTo($me);
			$('<form>\
					<label>Normal<input type="radio" name="viScope" value="0" checked="checked"/></label>\
					<label>Full<input type="radio" name="viScope" value="1"/></label>\
				</form>').appendTo($table).find(':radio').change(function(){
					$normalTable.add($fullTable).toggle();
				}
			);
			var $normalTable = $('<div/>').appendTo($table);
			var $fullTable = $('<div/>').appendTo($table).hide();
			
			loadGTables(function(){
				dataG = new google.visualization.DataTable();
				$.each(captions, function(){
					dataG.addColumn(this.type, this.caption );
				});
				dataG.addColumn("string", "Acciones");
				
				$.each(d, addUser);

				/* formateador para fechas */
				var formatter = new google.visualization.DateFormat({pattern: 'd/M/yyyy'});
				formatter.format(dataG, 6);
				formatter.format(dataG, 13);

				/* formateador de color para user level */
				formatter = new google.visualization.ColorFormat();
				formatter.addRange(4, 6, 'white', 'green');
				formatter.format(dataG, 11);

				/* formato para url */
				formatter = new google.visualization.PatternFormat('<a href="{0}">{0}</a>');
				formatter.format(dataG, [4]);

				/* format email */
				formatter = new google.visualization.PatternFormat('<a href="mailto:{0}">{0}</a>');
				formatter.format(dataG, [3]);

				var tableFull = new google.visualization.Table($fullTable[0]);
				tableFull.draw(dataG, {allowHtml: true});

				var view = new google.visualization.DataView(dataG);
				view.hideColumns([5,7,8,9,10,12,14]);

				var gTable = new google.visualization.Table($normalTable[0]);
				
				google.visualization.events.addListener(gTable, 'ready', function(){
					$('.google-visualization-table-table', $table).width('100%');

					/* botones */
					$($table[0]).on('click', '.iEdit, .iDelete', function(e){
						var id = $(this).parents('tr:first').find('td:first').text();
						var idx;
						var sel = gTable.getSelection();
						if(sel.length) {
							idx = sel[0].row;
						} else {
							$.each(d, function(i){
								if(id === this.id){
									idx = i;
									return false;
								}
								return true;
							});
							
							gTable.setSelection(idx);
						}

						if($(this).hasClass('iDelete')){
							if(!confirm('No se puede deshacer.\n¿Continuar?'))
								return;
							$.ajax({
								data: {method: 'remove', classname: 'user', id: id},
								type: 'POST',
								success: function(){
									d.splice(idx, 1);
									$table.remove();
									drawTable();
								}
							});
						} else if($(this).hasClass('iEdit')){
							var u = d[idx];
							$.dialog_iForm({
								title: 'Mantenimineto de usuarios',
								vars: {
									id: {value:  u.id, caption: 'Id', formtype: 'hidden'},
									uname: {value: u.uname, caption: 'Nombre', formtype:'text', required: true},
									name: {value: u.name, caption: 'N.Real', formtype: 'text'},
									email: {value: u.email, caption: 'Email', formtype: 'text'},
									url: {value: u.url, caption: 'Url', formtype: 'text'},
									pass: {value: '', caption: 'Password', formtype: 'password'},
									level: {value: u.level, caption: 'Nivel', formtype: 'text'},
									timezone_offset: {value: u.timezone_offset, caption: 'Z.Geogr&aacute;fica', formtype: 'selector', options: $.tz},
									image: {value: u.image, caption: euca._lang._IMAGE, formtype: 'image'}
								},
								onValueChange: function(name, value, callback){
									$.ajax({
										data: {m: 'changeVar', s: 'user', id: u.id, args: [name, value]},
										type: 'post',
										success: function(){
											//Si se ha modificado la password no debe dejar en blanco el valor
											if(name === 'pass')
												value = "";
											if(name === 'level')
												value = parseInt(value);
											callback(value);
											u[name] = value;
										}
									});
								},
								close: function(){
									$table.remove();
									drawTable();
								}
							});
						}
					});
				});
				
				gTable.draw(view, {allowHtml: true});
			});
		}
	}
	return this;
};

$.newUserForm = function(options){
	$.timeZoneList();
	
	$.dialogForm({title: 'Nuevo usuario',
			vars: {
				uid: {value: 0, formtype: 'hidden'},
				uname: {value: '', caption: 'Nombre', formtype:'text', required: true},
				name: {value: '', caption: 'N.Real', formtype: 'text'},
				email: {value: '', caption: 'eMail', formtype: 'text', required: true},
				url: {value: '', caption: 'Url', formtype: 'text'},
				pass: {value: '', caption: 'Password', formtype: 'password', required: true},
				image: {value: '', caption: 'Avatar', formtype: 'hidden'},
				location: {value: '', caption: 'User Address', formtype: 'hidden'},
				actkey: {value: '', caption: 'ActKey', formtype: 'hidden'},
				level: {value: '', caption: 'Nivel', formtype: 'text', required: true},
				timezone_offset: {value: 1, caption: 'Z.Geogr&aacute;fica', formtype: 'selector', options: $.tz},
				mailok: {value: 0, formtype: 'hidden'},
				language: {value: euca.deflang, formtype: 'hidden'}

			},
			onSubmit: function(data){
				var form = this;
				data.email = $.trim(data.email);
				
				if(!/^[^@]+@{1}\w+\.{1}\w{2,}$/.test(data.email))
					return $.alert('Dirección de correo inválida');

				$.ajax({
					data: {s: 'user', m: 'create', a: [data]},
					type: 'POST',
					dataType: 'json',
					success: function(d2){
						if(d2.errors){
							$.alert(d2.errors.join('<br/>'));
							return;
						}
						$.extend(data, d2);
						data.level = parseInt(data.level);
						options.callback.call(form, data);
					}
				});
			},
			onError: function(errorMsg){msg(errorMsg);return false;}
	});
};