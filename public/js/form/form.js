"use strict";

(function($){

$.jsLoaded(function(){
	euca.langs && $.count(euca.langs) > 1 && !$.fn.langSelector && $.loadJS('/cms/js/langselector.js');
});

$.timeZoneList = function(){
	if(!$.tz){
		$.ajax({
			data: {classname: 'client', method: 'timeZoneList'},
			async: false,
			success: function(timeZ){
				$.tz = timeZ;
			}
		});
	}
	return $.tz;
};

$.dialogForm = function(options){
	var $popup = $('<div data-history="false" data-overlay-theme="b" data-dismissible="false" class="ui-popup ui-body-b ui-overlay-shadow ui-corner-all" style="min-width:400px">\
			<div class="ui-header ui-bar-a">\
				<h1 class="ui-title">' + (options.title || 'Form') + '</h1>\
			</div>\
			<div role="main" class="ui-content"><form></form></div>\
		</div>');

	var $form = $popup.find('form').form(options);

	$popup.popup({
			afterclose: function(){
				$('.rte-panel').remove();
				$(this).popup('destroy');
			},
			afteropen: function(){
				setTimeout(function(){
					$form.find(".rte-toolbar").next().each(function(){
						this.contentWindow.document.designMode = 'on';
					});
				}, 1);
			}
		})
		.popup('open');
};

$.dialog_iForm = function(options){
	var $c = $('<div title="' + (options.title || 'File') + '" style="display:none">').appendTo('body').iForm(options);
	$c.dialog({
		width: 'auto',//(options.width || $c.width()) + 30,
		modal: true,
		close: function(){$c.dialog('destroy').remove();options.close && options.close();},
		open: function(){$c.show();}
	});
	return $c;
};

$.fn.appendElement = function(options){
	var o = $.extend({
		langs: euca.langs
	}, options);

	return this.each(function(){
		var $el = $(this);
		switch(o.formtype){
			case 'label':
				$el.append(o.value);
				break;
			case 'textarea':
				$el = $('<textarea>').appendTo(this).css('overflow', 'auto');
				if(!o.multilang ){
					$el.val(o.value);
					$el.attr({name: o.name, id: o.name});
				}
				o.size && $el.attr('size', o.size).width(Math.round(o.size * 5.5) + 4);
 				o.css && $el.css(o.css);
				o.width && $el.width(o.width);
				o.height && $el.height(o.height);
				break;
			case 'yesno'://deprecated
			case 'boolean':
				$el.boolean(o);
				break;
			case 'radio':
				$el.formRadio(o);
				break;
			case 'user':
				if(!$.getUsers)
					$.loadJS('/js/user.js');
				
				o.options = $.getUsers();
				if(!o.value)
					o.options = $.extend({'0': euca._lang._NONE}, {'new': euca._lang._CREATE}, o.options);
				$el.formUser(o);
				break;
			case 'country':
			case 'select':
			case 'selector':
				$el.formSelector(o);
				break;
			case 'checkboxes':
				$el.checkboxes(o);
				break;
			case 'video':
			case 'image':
			case 'audio':
			case 'file':
				$el.formFile({
					name: o.name,
					type: o.formtype,
					value: o.value
				});
				break;
			case 'bdi':
				$el.formSimpleImage({
					value: o.value
				});
				break;
			case 'percent':
				$el.formPercent(o);
				break;
			case 'datetime':
			case 'date':
				$el.formDate(o);
				break;
			case 'time':
				$el.formTime(o);
				break;
			case 'location':
				$el.formLocation(o);
				break;
			case 'watermark':
				var wmoptions = {
					colname: o.colname,
					itemid: null,
					name: o.name,
					value: o.value
				};
				$el.formWatermark(wmoptions);
				break;
			case 'multi':
				$el.formMulti(o);
				break;
			case 'text':
			default:
				$el = $('<input type="'+o.formtype+'"/>').appendTo(this);
				o.multilang || $el.attr('value', o.value);
				o.formtype === 'url' && !o.size && (o.size = 64);
				if(o.size){
					$el.attr('size', o.size);
					$el.width(Math.round(o.size * 5.5));
				}
				o.maxlength && $el.attr('maxlength', o.maxlength);
				$el.attr({name: o.name});
		}
	
		if(o.onChange)
			$el.change(o.onChange);

		if(o.multilang && o.langs && $.count(o.langs)){
			$.count(o.langs) > 1 && $el.addClass('ui-state-highlight multilang');
			o.value || (o.value = {});
			var me = this;
			$.each(o.langs, function(code, name){
				var $e = $el.clone(true).appendTo(me)
					.attr({name: o.name + '[' + code + ']', id: o.name + '[' + code + ']'});
			
				o.value[code] && $e.val(o.value[code]);
			
				if(o.formtype === 'textarea' && o.rte){
					$e = $e.wrap('<div>').parent();
					$e.find('textarea').rte();
				}
				
				$e.attr('rel', code);
				if(code !== euca.deflang)
					$e.hide();
			});
			$el.remove();
		} else if(o.rte && o.formtype === 'textarea'){
			$el = $el.wrap('<div>').parent();
			$el.find('textarea').rte();
			$el.find('[rel="image"]').remove();
		}
		
		if(o.extra)
			$el.append(o.extra);
	});
};

$.fn.formUser = function(o){
	var $el = $('<select name="'+o.name+'"/>').appendTo(this);
	if(o.multiple)
		$el.attr('multiple', 'multiple');
	var isArray = $.isArray(o.options);
	$.each(o.options, function(v, n){
		if(isArray)	v = n;
		$el.append('<option value="' + v + '">' + n +'</option>');
	});
	$el.val(o.value);
	return this;
};

$.fn.formSelector = function(o){
	var $el = $('<select name="'+o.name+'"/>').appendTo(this);
	var isArray = $.isArray(o.options);
	
	if(o.insertEmpty || !o.value){
		var $empty = $('<option value="">&nbsp;</option>').appendTo($el);
		o.insertEmpty && $el.one('change', function(){
			$empty.remove();
		});
	}
	
	$.each(o.options, function(v, n){
		if(isArray)	v = n;
		$el.append('<option value="' + v + '">' + n +'</option>');
	});
	
	if(o.multiple)
		$el.attr('multiple', 'multiple');
	
	if(o.value && (isArray ? $.inArray(o.value) === -1 : !o.options[o.value]))
		$el.append('<option value="' + o.value + '">' + o.value +'</option>');
		
	$el.val(o.value);
	
	$el.change(function(){
		$(this).parent().trigger('change onChange', [$el.val()]);
	});
	
	o.mobiscroll &&  $.fn.mobiscroll && $el.mobiscroll().select({
		theme: 'ios',
		lang: 'es',
		display: 'bubble',
		tab: false,
		inputClass: 'mobiscroll',
		animate: 'flip'
	});

	return this;
};
$.fn.checkboxes = function(o){
	var $me = this,
		isArray = $.isArray(o.options);

	o.value = o.value || [];
	
	$.each(o.options, function(v, n){
		if(isArray)	v = n;
		$me.append('<label><input name="'+o.name+'" type="checkbox" value="' + v + '"/>' + (o.multilang ? $.safeLang(n) : n) + '</label>');
	});

	$me.find('input').val(o.value).change(function(){
		var newval = [];
		
		$me.find('input:checked').each(function(){newval.push(this.value);});
		
		o.onChange(newval, function(r){
			if(r)
				o.value = newval;
			else
				$me.find('input').val(o.value);
		});
	});

	return this;
};
$.fn.boolean = function(o){
	var $i = $('<input name="'+o.name+'" type="checkbox" value="true"' + (o.value ? ' checked="checked"' : '')+ '/>')
		.appendTo(this);

	o.onChange && $i.change(function(){
		o.onChange.call($i, $i[0].checked, function(r){
			if(!r)
				$i[0].checked = !$i[0].checked;
		});
	});

	return this;
};

$.fn.formRadio = function(o, aux){
	var $me = this;

	if(typeof(o) === 'string'){
		switch(o){
			case 'val':
				if(aux === undefined)
					return this.find('input:checked').val();
				else
					return this.find('input').val([aux]);
				break;
		}
	} else {
		o = $.extend({
			separator: ''
		}, o);
	
		$.each(o.options, function(v, n){
			$me.append('<label style="display:inline;">'
				+'<input type="radio" name="'+o.name+'" value="'+v+'" ' + (o.value === v ? 'checked="checked"' : '') + '/>' + n +'</label>'
				+ o.separator
			);
		});
	
		o.onChange && $me.find('input').click(function(){
			o.onChange.call($me, this.value);
		});
	}
	return this;
};

$.fn.formDate = function(o){
	var datestr = '';
	
	//https://github.com/arschmitz/jquery-mobile-datepicker-wrapper
	if($.fn.date)
		$.fn.datepicker = $.fn.date;
	
	if(o.value){
		var date = o.value;
		if(date.constructor !== Date)
			date = new Date(o.value*1000 || o.value);
		
		datestr = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
	}
	var text = $('<span>' + datestr + '</span>').appendTo(this);

	$('<input type="hidden" name="'+o.name+'" value="' + datestr + '"/>').appendTo(this).datepicker({
		//maxDate: 10,
		showOn: 'both',
		dateFormat: 'd/m/yy',
		buttonImage: '/cms/img/calendar.gif',
		buttonImageOnly: true,
		onClose: function(t){text.text(t);},
		buttonText: $.lang('_EDIT')
	}).change(function(){
		o.onChange && o.onChange($(this).datepicker('getDate').getTime() / 1000);
	});
	return this;
};

$.fn.formTime = function(o){
	var value, minutes, hours;
	
	if(o.value.constructor === Date){
		hours = o.value.getHours();
		minutes = o.value.getMinutes();
		value = hours * 60 + minutes;
	} else {
		value = parseInt(o.value, 10) || 0;
	
		minutes = value%60;
		hours = value - minutes;
	}
	
	var $field = $('<input type="hidden" name="'+o.name+'" value="' + value + '"/>').appendTo(this);

	$('<div><input type="text" rel="h" value="' + hours + '" maxlength="2" size="2"/>h : <input type="text" rel="m" value="' + minutes + '" maxlength="2" size="2"/>m</div>')
		.appendTo(this)
		.find('input')
		.css({textAlign: 'right', width: '1.4em'})
		.focus(function(){
			$(this).select();
		}).change(function(){
			$(this).val(parseInt($(this).val(), 10) || 0);
			var $p = $(this).parent();
			value = ($p.find('[rel="h"]').val() * 60) + parseInt($p.find('[rel="m"]').val(), 10);
			$field.val(value);
			o.onChange && o.onChange(value, $.noop);
		});

	return this;
};

$.fn.iPercent = function(o){
	var $c = this;
	
	$('<span>' + (o.value ? o.value + '%' : emptyLabel()) + '</span>').appendTo(this).editIconAfter(function($link){
		var $valueText = $(this).hide(),
			$slider = $('<div style="display:inline-block;margin:0 8px -2px 5px">').appendTo($c).formPercent({
				value: o.value
			});
		
		$('<input type="button" value="' + $.lang('_DONE') + '"/>').appendTo($c).one('click', function(){
			$(this).remove();
			$link.show();
			
			var newval = $slider.find('input').val();
			
			$slider.remove();
			
			o.onChange.call($c, newval, function(r){
				if(r)
					o.value = newval;
				
				$valueText.html(newval + '%');
			});
			
			$valueText.show();
		});
	});

	return this;
};

$.fn.formPercent = function(options){
	var o = $.extend({
		value: 0,
		onChange: $.noop,
		width: 200
	}, options);
	
	return this.each(function(){
		var $me = $(this);
			
		$('<div style="display:inline-block;margin:0 4px -2px">').appendTo(this).width(o.width).slider({
			value: o.value,
			slide: function(e,ui){
				$text.html(ui.value + '%');
			},
			change: function(e,ui){
				$input.val(ui.value);
				o.onChange.call(this, ui.value);
				$me.trigger('change', [ui.value]);
			}
		}).find('a');
	
		var $input = $('<input type="hidden" name="' + o.name + '" value="' + o.value + '"/>').appendTo(this),
			$text = $('<span style="display:inline-block;width:35px;text-align:right">' + o.value + '%</span>').appendTo(this);
	});
};

$.fn.formMulti = function(options){
	var o = $.extend({
		value: [],
		onChange: $.noop
	}, options);
	
	return this.each(function(){
		var $d = $('<div style="position:relative"/>').appendTo(this);
		
		$.each(o.value, addPart);
		
		var $plus = $('<a href="#" class="ui-icon ui-icon-circle-plus"></a>').appendTo(this).click(function(e){
			e.preventDefault();
			
			addPart(o.value.length);
			o.value.push({});
			$(this).hide();
		});
	
		function addPart(k, p){
			var $t = $('<table/>')
				.addClass("ui-widget-content ui-corner-all")
				.css({marginBottom: '4px'})
				.appendTo($d);
		
			$.each(o.options, function(name){
				formTr($t, this.caption, this.description, this.required).appendElement({
					name: o.name + '[' + k + '][' + name + ']',
					value: p ? {value: p[name]} : null,
					formtype: this.formtype,
					options: this.options,
					onChange: function(v,c){
						o.value[k][name] = v;
						$plus.show();
						
						o.onChange(o.value, c);
					}
				});
			});
		
			$('<a href="#" class="ui-icon ui-icon-circle-close" style="position:absolute"></a>').appendTo($d).position({
				of: $t,
				my: 'left center',
				at: 'right top'
			}).click(function(e){
				e.preventDefault();
				
				$(this).remove();
				$t.remove();
				
				o.value.splice(k, 1);
				
				if(k === o.value.length)
					$plus.show();
				
				o.onChange(o.value);
			});
		}
	});
};

$.fn.iMulti = function(options){
	var o = $.extend({
		value: [],
		onChange: $.noop
	}, options);
	
	return this.each(function(){
		var $t = $('<table class="tablesorter"><thead><tr></tr></thead><tbody></tbody></table>').appendTo(this),
			$tr = $t.find('tr');
		
		$.each(o.options, function(name){
			$tr.append('<th>' + name + '</th>');
		});
		
		$tr.append('<th>&nbsp;</th>');
		
		$.each(o.value, addPart);
		
		var $plus = $('<a href="#" class="ui-icon ui-icon-circle-plus"></a>').appendTo(this).click(function(e){
			e.preventDefault();
			
			addPart(o.value.length);
			o.value.push({});
			$(this).hide();
		});
		
		$t.tablesorter({
			headers: {2: {sorter: false}},
			widgets: ['jqueryui']
		});
	
		function addPart(k, p){
			$tr = $('<tr>').appendTo($t);
			$.each(o.options, function(name){
				$('<td><div></div></td>').appendTo($tr).find('div').iField({
					ele: $.extend({}, this, p ? {value: p[name]} : null),
					onChange: function(v,c){
						o.value[k][name] = v;
						$plus.show();
						
						o.onChange(o.value, c);
					}
				});
			});
				
			$('<td><a href="#" class="ui-icon ui-icon-circle-close"></a></td>').appendTo($tr).find('a').click(function(e){
				e.preventDefault();

				$(this).remove();
				$tr.remove();

				o.value.splice(k, 1);

				if(k === o.value.length)
					$plus.show();

				o.onChange(o.value);
			});
		}
	});
};

//Método principal de formulario
$.fn.form = function(options) {
	return this.each(function(){
		var s = $.extend({
			title: 'Form',
			onSubmit: function(){return false;},
			onCancel: $.noop,
			onValueChange: $.noop,
			submitName: $.lang('_SUBMIT'),
			cancelName: $.lang('_CANCEL'),
			onLangChange: $.noop,
			onError: function(m){$.alert(m);},
			vars: {},
			langs: euca.langs,
			showSubmitButton: true,
			showCancelButton: true,
			cssUi: false
		}, options);

		var $langSel
		,	required
		,	$this = $(this)
		,	me = this
		,	$t = $('<table>').width('100%').appendTo(this);
		
		$this.attr('align', 'center').width(s.width);

		$.each(s.vars, function(k,v){
			if(v.formtype === 'autoinc' && !v.value)
				return;

			var $c;
			
			v.name = k;
			
			if(v.multilang)
				v.langs = s.langs;

			if(v.formtype === 'hidden')
				$c = $(me);
			else 
				$c = formTr($t, v.caption || k, v.description, v.required);

			$c.appendElement(v);

			v.required && (required = true);
		});
		
		var $buttons = $('<div class="formbuttons"/>').appendTo(this)
		,	$footer = $('<table class="formFooterLegend"/>').appendTo($buttons);
		
		required && $footer.append('<tr><td>*</td><td> Campos requeridos</td></tr>');
		
		var $submitButton = $('<input type="submit" value="'+s.submitName+'" data-inline="true" data-mini="true"/>').appendTo($buttons);
		
		if(s.showSubmitButton)
			$submitButton.button();
		else
			$submitButton.hide();
	
		if(s.showCancelButton)
			$('<input type="button" value="'+s.cancelName+'"/>').button().appendTo($buttons)
				.click(function(){$(me).trigger('cancelForm');});
		
		if($this.find('.multilang').size() && s.langs && $.count(s.langs) > 1){
			var $wrapperTable = $('<table><tr><td></td><td></td></tr></table>').prependTo(this);
			
			$wrapperTable.find('td:first').append($t);
			
			$langSel =$wrapperTable.find('td:last').langSelector({
				langs: euca.langNames,
				form: this
			});
			
			$footer.append('<tr><td class="ui-state-highlight"></td><td>Campos multi-idioma</td>');
			
			$t.find(".rte-toolbar").next().each(function(){
				this.contentWindow.document.designMode = 'on';
			});
		}

		if(s.cssUi){
			$this.addClass('ui-widget').find('h3:first').addClass('ui-widget-header ui-corner-top').css({marginBottom: 0});
			$t.wrap('<div/>').parent()
				.addClass('ui-widget-content')
				.css({
					borderTop: 'none',
					borderBottom: 'none',
					padding: '10px 0'
				});
			$buttons.addClass('ui-widget-content ui-corner-bottom').css({marginTop: 0});
		}

		/* Borra ficheros enviados al servidor, en el caso de que se cancele el formulario */
		//TODO: Repasar
		$this.bind('cancelForm keypress', function(e){
			if(e.type === 'keypress' && e.keyCode !== 27) return;
			$(me).hide();
			$this.trigger('close');
			s.onCancel.call(me);
		});

		$this.submit(function(e){
			e.preventDefault();
			
			var data = {}, errors = [];
			
			$this.find('.ui-state-error-text').removeClass('ui-state-error-text').find('.ui-icon-alert').remove();
			$this.find('.ui-state-error').removeClass('ui-state-error');
			$this.find('textarea').cleanupWord();
			$.each($this.deepSerializeArray(), function(){
				if(this.name !== 'langsel'){
					if(s.vars[this.name] && s.vars[this.name].formtype === 'checkboxes'){
						if(!data[this.name])
							data[this.name] = [];
						data[this.name].push(this.value);
					} else
						data[this.name] = this.value;
				}
			});
			var curLangCode = $langSel ? $langSel.data('langSelector').val : euca._LANGCODE,
				form = this;
			$.each(s.vars, function(name){
				if(!this.required || this.formtype === 'autoinc')
					return;

				var $el = $();
				if(this.multilang){
					if(this.required){
						var hasSomeLang = false;
						$.each(s.langs, function(langcode, langname){
							if(data[name][langcode])
								hasSomeLang = true;
						});
						if(!hasSomeLang){
							this.hasErrors = true;
							errors.push($.lang(this.caption));
							$el = $('[name="' + name + '\\[' + curLangCode + '\\]"]');
						}
					}
				} else if(!data[name]){
					this.hasErrors = true;
					errors.push($.lang(this.caption));
					$el = $('[name="' + name + '"]', form);
				}
				if(this.hasErrors){
					$el.parents('tr:first').addClass('ui-state-error').find('.formcaption')
						.prepend('<span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em;"></span>');
				}
			});
			if(errors.length){
//					s.onError('Hay campos requeridos sin rellenar: <br/>' + errors.join(',<br/>'), 'error');
				$('.ui-state-error:first', form).focus();
				return false;
			}
			if($('.formFile').data('uploading')){
				s.onError('No es posible enviar el formulario hasta que se hayan enviado todos los archivos', 'result');
				return false;
			}

			s.onSubmit.call(this, data);
			$this.trigger('close');
			return false;
		});

		$this.change(function(e){
			var $target = $(e.target);
			var name = $target.attr('name');
			var val = $target.val();
			var r = /(\w+)\[(\w*)\]/.exec(name);
			if(r){
				name = r[1];
				if(r[2]){
					var val_ = {};
					val_[r[2]] = val;
					val = val_;
				} else {
					val = [];
					$('[name="' + name + '\\[\\]"]', me).each(function(){
						val.push($this.val());
					});
				}
			}
			s.onValueChange(name, val);
		});

		$(me).find('input[type="text"],textarea').eq(0).select();
	});
};

	/* Campo interactivo */
$.fn.iField = function(options){
	var s = $.extend({
		curlang: euca._LANGCODE,
		onChange: function(val, callback){callback(true);}
	}, options);
	var ele = s.ele, value = ele.value;
	return this.each(function(){
		var $c = $(this);
		ele.onChange = s.onChange;
		switch(ele.formtype){
			case 'radio':
				ele.separator = $.count(ele.options) > 3 ? '<br/>' : '';
				$c.formRadio(ele);
				break;
			case 'video':
			case 'image':
			case 'audio':
			case 'file':
				$c.formFile({
					colname: s.handler,
					id: s.id,
					name: ele.name,
					type: ele.formtype !== 'file' ? ele.formtype : null,
					curlang: s.curlang,
					value: ele.value,
					onChange: s.onChange
				});
				break;
			case 'percent':
				$c.iPercent(ele);
				break;
			case 'datetime':
			case 'date':
				$c.css('margin', '0 10px').formDate(ele);
				break;
			case 'time':
				$c.iTime(ele);
				break;
			case 'bdi':
				$c.formSimpleImage({
					onChange: s.onChange,
					value: ele.value
				});
				break;
			case 'user':
				if(!$.getUsers)
					$.loadJS('/js/user.js');
				
				var level = (ele.options ? ele.options.level : undefined);
				ele.options = $.getUsers(level);
				
				if(!ele.value)
					ele.options = $.extend({'0': euca._lang._NONE, 'new': euca._lang._CREATE}, ele.options);
				else if(!ele.options[ele.value])
					ele.options[ele.value] = $.getUname(ele.value);

				var opt = {}, opt_length = 0;
				$.each(ele.options, function(t, v){
					opt[t] = v;
					opt_length++;
				});
				var $valueText = $('<span>' + optVal2Text(ele.value, opt) + '</span>').appendTo($c);
				$c.append(' ');
				$('<a href="javascript:;" style="margin-left: 6px;">' + $.lang('_EDIT') + '</a>').appendTo($c).click(function(){
					$(this).hide();
					$valueText.hide();
					var $link = $(this);
					var $sel = $('<select size="' + opt_length + '" multiple="multiple">').appendTo($c);
					function newFormUser(g){
						var option = {
							group_id: g,
							callback: function(data){
								$(form).trigger('close');
								var newid = parseInt(data.uid);
								opt[data.uid] = data.uname;
								newval = data.uid;
								s.onChange(newval, function(r){
									r && $valueText.html(optVal2Text(ele.value, opt));
								});
							}
						};
						$.newUserForm(option);
					}
					function selDone(){
						$valueText.show();
						var newval = $sel.val();
						if(!$.isArray(ele.value))
							newval = newval[0];
						$sel.remove();
						if(newval !== ele.value){
							ele.value = newval;
							if(newval === 'new'){//Nuevo usuario;
								$.timeZoneList();
								
								newFormUser();
							}
							$valueText.html('Enviando...');
							s.onChange(newval, function(r){
								r && $valueText.html(optVal2Text(ele.value, opt));
							});
						}
						$link.show();
					}
					if($.isArray(ele.value)){
						$('<input type="button" value="' + $.lang('_DONE') + '"/>').appendTo($c).one('click', function(){
							$(this).remove();
							selDone();
						});
					} else
						$sel.click(selDone);
					$.each(opt, function(v, t){
						$sel.append('<option value="' + v + '">' + t + '</option>');
					});
					if(opt[ele.value] === undefined)
						$sel.append('<option value="' + ele.value + '">' + ele.value + '</option>');
					$sel.val(ele.value);
				});
				break;
			case 'country':
				ele.options = getCountries();
			case 'select':
			case 'selector':
				$c.iSelector(ele);
				break;
			case 'yesno'://deprecated
			case 'boolean':
				$c.boolean(ele);
				break;
			case 'checkboxes':
				$c.checkboxes(ele);
				break;
			case 'location':
				$c.iFormLocation(ele);
				break;
			case 'watermark':
				var o = {
					colname: o.colname,
					itemid: s.id,
					name: ele.name,
					value: ele.value
				};
				$c.iFormWatermark(o);
				break;
			case 'multi':
				$c.iMulti(ele);
				break;
			case 'form':
				$c.iForm(ele);
				break;
			default:
				$c.iText($.extend({onChange: s.onChange}, s.ele, {curlang: s.curlang}));
		}
	});
};

$.fn.iForm = function(options, val){
	var $t, s, hasMultilang;
	
	function addField(k,v){
		if(!v.formtype || v.formtype === 'hidden')
			return;
		
		v.name = k;
		
		var $d = formTr($t, v.caption || k, v.description, this.required);
		
		if(v.formtype === 'label')
			$d.append(v.value);
		else {
			var opt = $.extend({}, s, {
				ele: v,
				onChange: function(val, callback){
					if(v.required && !val)
						callback(false);
					else
						s.onValueChange(k, val, callback);
				}
			});
			
			delete(opt.vars);
			
			$d.iField(opt);
			
			if(v.multilang || $.inArray(v.formtype, ['image', 'video', 'audio', 'file']) !== -1){
				hasMultilang = true;
				$d.bind('langChange', function(e, lang){
					opt.curlang = lang;
					$d.empty().iField(opt);
				});
			}
		}
	}
	
	if(val){
		$t = this.find('table:first');
		switch(options){
			case 'addField':
				$.each(val, addField);
				break;
		}
		return this;
	}
	
	s = $.extend({
		onValueChange: $.noop,
		vars: {},
		title: null
	}, options);
	
	if(s.description || s.title){
		var $header = $('<div style="border-bottom:1px solid #CCCCCC"><br style="clear:both"/></div>').appendTo(this);

		if(s.title)
			$header.prepend('<h4>' + s.title + '</h4>');

		if(s.description)
			$header.prepend('<span style="font-style:italic;float:right;text-align:right">' + s.description + '</span>');
	}
	
	$t = $('<table>').appendTo(this);
	
	$.each(s.vars, addField);
	
	if($.fn.langSelector && hasMultilang){
		var $tr = $('<table><tr></tr></table>').appendTo(this).find('tr');
		$('<td></td>').appendTo($tr).append($t);
		var $ls = $('<td></td>').appendTo($tr).langSelector({
			langs: euca.langNames,
			change: function(lang){
				$t.find('.formfield').trigger('langChange', [lang]);
			}
		});
		
		$('<div class="formbuttons"><table class="formFooterLegend"><tr><td class="ui-state-highlight"></td><td>Campos multi-idioma</td></tr></table></div>').appendTo(this);
	}

	return this.addClass('iForm');
};

$.fn.iMultiSelector = function(ele){
	// ele.options puede ser o no una matriz
	var $c = this
	,	opt = {};
	
	$.each(ele.options, function(t, v){
		opt[t] = v;
	});
	
	var $valueText = $('<span>' + optVal2Text(ele.value, opt) + '</span>').appendTo($c);
	
	$c.append(' ');
	
	$('<a href="javascript:;" style="margin-left: 6px;">' + $.lang('_EDIT') + '</a>').appendTo($c).click(function(){
		$(this).hide();
		$valueText.hide();
		var $link = $(this);
		var $form = $('<form></form>').appendTo($c).submit(function(e){
			e.preventDefault();
			
			$valueText.show();
			
			var newval = [];
			
			$.each($(this).serializeArray(), function(){
				newval.push(this.value);
			});
			
			$(this).remove();
			
			if(newval.toString() !== ele.value.toString()){
				ele.value = newval;
				$valueText.html('Enviando...');
				ele.onChange(newval, function(r){
					r && $valueText.html(optVal2Text(ele.value, opt));
				});
			}
			$link.show();
		});
		
		$.each(opt, function(v, t){
			$form.append('<label><input name="'+ele.name+'" type="checkbox" value="' + v + '"' + ($.inArray(v, ele.value) !== -1 ? ' checked="checked"' : '') + '/>' + t + '</label>');
		});
		
		$form
			.append('<input type="submit" value="' + $.lang('_DONE') + '">')
			.val(ele.value);
	});
};

$.fn.iSelector = function(ele){
	var $c = this;
	// ele.options puede una matriz o un objeto
	var opt = {}, opt_length = 1;
	$.each(ele.options, function(t, v){
		v = v[euca._LANGCODE] || v;
		opt[t] = v;
	});
	if($.isArray(ele.options))
		ele.datatype = 'int';
	
	$('<span>' + optVal2Text(ele.value, opt) + '</span>').appendTo($c).editIconAfter(function($link){
		var $valueText = $(this).hide(),
			$sel = $('<select size="8" multiple="multiple">').appendTo($c);
			
		function selDone(){
			$valueText.show();
			var newval = $sel.val();
			//Convierte a numéricos los valores si es una matriz
			if(ele.datatype === 'int'){
				$.each(newval, function(k,v){
					newval[k] = parseInt(v,10);
				});
			}
			if(!$.isArray(ele.value))
				newval = newval[0];
			$sel.remove();
			if(newval !== ele.value){
				ele.value = newval;
				$valueText.html('Enviando...');
				ele.onChange(newval, function(r){
					r && $valueText.html(optVal2Text(ele.value, opt));
				});
			}
			$link.show();
		}
		if($.isArray(ele.value)){
			$('<input type="button" value="' + $.lang('_DONE') + '"/>').appendTo($c).one('click', function(){
				$(this).remove();
				selDone();
			});
		} else
			$sel.click(selDone);
		
		$.each(opt, function(v, t){
			$sel.append('<option value="' + v + '">' + t + '</option>');
		});
		
		if($.isArray(ele.value)){
			$.each(ele.value, function(v, t){
				if(opt[t] === undefined)
					$sel.append('<option value="' + t + '">' + t + '</option>');
			});
		}else{
			if(ele.value && opt[ele.value] === undefined)
				$sel.append('<option value="' + ele.value + '">' + ele.value + '</option>');
		}
	
		var optsize = $sel.find('>option').size();
		
		if(optsize < 8)
			$sel.attr('size', optsize);
		
		if($sel.find('>option').size())
			$sel.val(ele.value);
		
		$sel.focus();
	});
};

/* Implements text box & textarea interactive fields */
$.fn.iText = function(o){
	o = $.extend({
		formtype: 'text',
		curlang: euca._LANGCODE,
		langs: euca.langs,
		emptyLabel: emptyLabel(),
		modal: false,
		onChange: function(a,b){b(true);}
	}, o);
	
	if(!o.width){
		switch(o.formtype){
			case 'text':
				o.width = 160;
				break;
			case 'textarea':
				break;
			default:
				o.width = 60;
		}
	}
	
	return this.each(function(){
		var $me = $(this),
			value = o.value || $me.html(),
			$translate;

		$me.empty();

		if(o.multilang){
			if(!$.isPlainObject(o.value))
				o.value = {};
			value = o.value[o.curlang] || '';
		}

		value = $.trim(value);

		function toshow(){
			if(value){
				switch(o.formtype){
					case 'password':
						return value.replace(/./g, '*');
					case 'url':
						return '<a href="' + value + '">' + value + '</a>';
					case 'textarea':
						return value.replace(/\n/g, '<br/>');
					case 'number':
						return parseFloat(value).toLocaleString();
					default:
						return value;
				}
			} else
				return o.emptyLabel;
		}

		var $valueContainer = $('<div>').appendTo($me);
		
		var $valueText = $('<span class="form-iText" style="float:left">' + toshow() + '</span>').appendTo($valueContainer).editIconAfter(function($link){
			o.modal || $valueContainer.hide();

			var $input = o.formtype === 'textarea' ? $('<textarea>' + value + '</textarea>') : $('<input type="' + o.formtype + '" value="' + value + '"/>'),
				$formContainer = o.modal ? $('<div/>') : $me,
				$form = $('<form></form>').appendTo($formContainer).append($input);

			if(o.size)
				$input.attr('size', o.size);
			else
				$input.css('width', o.width);

			var rteOpt = {};

			if(o.modal){
				$formContainer.dialog({
					modal: true,
					resizable: false,
					width: o.rte ? 450 : $form.width(),
					height: o.rte ? 360 : $form.height()
				});
				rteOpt = {
					width: 420,
					height: 200
				};
			} else if(o.resizable)
				$input.addClass('ui-widget-content').css('resize', 'both');

			if(o.rte){
				var rte = $form.find('textarea').rte(rteOpt);
				//if(rte.length) rte[0].disable_design_mode();
			}

			$form.submit(function(e){
				e.preventDefault();
				
				var newval = $.cleanupWord($.trim($form.find('input, textarea').val()));

				if(newval !== value){
					$me.addClass('loading16');
					$valueText.html(newval || ('(' + $.lang('Empty') + ')'));
					
					var val2ret;
					
					if(o.multilang){
						val2ret = {};
						val2ret[o.curlang] = newval;
					} else
						val2ret = newval;
					
					o.onChange.call($me.get(0), val2ret, function(r){
						$me.removeClass('loading16');
						if(r){
							value = newval;
							if(o.multilang)
								o.value[o.curlang] = newval;
							else
								o.value = newval;
						}
						$valueText.html(toshow());
					});
				}
				$valueText.show();
				$link.show();
				$(this).remove();
				$valueContainer.show();
				$translate && $translate.remove();
				o.modal && $formContainer.dialog('destroy');
			});
			
			var $formFooter = $('<div class="done-btn"/>').appendTo($form);
			
			if(o.multilang && euca.langs && $.count(euca.langs) > 1){
				var aa = [];
				$.each(euca.langs, function(code, name){
					if(code === o.curlang || !o.value[code]) return;
					aa.push('<a href="#' + code + '">' + name + '</a>');
				});
				if(aa.length && o.translatable && euca.translate){
					$translate = $('<span>Traducir del ' + aa.join(', ') + '</span>').appendTo($formFooter);
					$translate.find('a').click(function(){
						var code = $(this).attr('href').substr(1);
						var $target = $form.find('input[type="text"], textarea');
						if(!$target.size())
							$target = $form.find('iframe').contents().find('body');
						$target.translate({
							from: code,
							to: o.curlang,
							text: o.value[code]
						});
						return false;
					});
				}
			}


			$('<input type="submit" value="' + $.lang('_DONE') + '" style="padding: 0.2em 1em; margin-left: 10px;"/>')
				.appendTo($formFooter).button();

			o.modal && $formContainer.find('.rte-resizer a').remove();

			if(o.formtype === 'textarea')
				$input.focus();
			else
				$input.select();
		}, '16px');
		
		if(o.multilang && $.count(o.langs) > 1)
			$valueText.addClass('ui-state-highlight multilang');
		
		if(o.multilang && $.count(o.value)){
			$valueContainer.find('div:last').append('<a href="#" class="ui-icon ui-icon-trash" title="' + $.lang('_DELETE') + '"></a>')
			.find('.ui-icon-trash').click(function(e){
				e.preventDefault();
				$.confirm({
					message: 'Eliminar el contenido de este campo en TODOS los idiomas',
					onClick: function(r){
						if(!r)
							return;
						
						o.value = {};
						value = '';
						o.onChange.call($me.get(0), {});
						$(this).prev().click().end().remove();
					}
				});
			});
		}
		
		$valueContainer.append('<br style="clear: both"/>');
	});
};

$.fn.iTime = function(o){
	var value;
	
	if(o.value.constructor === Date){
		var hours = o.value.getHours();
		var minutes = o.value.getMinutes();
		value = hours * 60 + minutes;
	} else {
		value = parseInt(o.value, 10) || 0;
	}
	
	var	$me = this,
		$valueText = $('<span>' + $.int2time(value) + '</span>').appendTo(this);

	this.append(' ');

	$valueText.appendTo($me).editIconAfter(function($link){
		$(this).hide();
		$valueText.hide();
		$('<form></form>').appendTo($me).formTime(o).submit(function(e){
			e.preventDefault();

			$link.show();
			var newval = $(this).find('input[type="hidden"]').val() * 1;

			if(newval !== value){
				$me.addClass('loading16');
				o.onChange(newval, function(r){
					$me.removeClass('loading16');
					
					if(r)
						o.value = value = newval;
					
					$valueText.html($.int2time(o.value));
				});
			}
			$(this).remove();
			$valueText.show();
		});
	});

};

//helpers
$.int2time = function(i){
	i = parseInt(i, 10) || 0;
	var min = i%60;
	return (i - min) / 60 + 'h ' + min + 'm';
};

$.fn.cleanupWord = function(){
	return this.each(function(){
		$(this).val($.cleanupWord($(this).val()));
	});
};

$.cleanupWord = function(s) {
	s = s.replace(/<o:p>\s*<\/o:p>/g, '') ;
	s = s.replace(/<o:p>[\s\S]*?<\/o:p>/g, '&nbsp;') ;

	// Remove mso-xxx styles.
	s = s.replace( /\s*mso-[^:]+:[^;"]+;?/gi, '' ) ;

	// Remove margin styles.
	s = s.replace( /\s*MARGIN: 0cm 0cm 0pt\s*;/gi, '' ) ;
	s = s.replace( /\s*MARGIN: 0cm 0cm 0pt\s*"/gi, "\"" ) ;

	s = s.replace( /\s*TEXT-INDENT: 0cm\s*;/gi, '' ) ;
	s = s.replace( /\s*TEXT-INDENT: 0cm\s*"/gi, "\"" ) ;

	s = s.replace( /\s*TEXT-ALIGN: [^\s;]+;?"/gi, "\"" ) ;

	s = s.replace( /\s*PAGE-BREAK-BEFORE: [^\s;]+;?"/gi, "\"" ) ;

	s = s.replace( /\s*FONT-VARIANT: [^\s;]+;?"/gi, "\"" ) ;

	s = s.replace( /\s*tab-stops:[^;"]*;?/gi, '' ) ;
	s = s.replace( /\s*tab-stops:[^"]*/gi, '' ) ;

	// Remove FONT face attributes.
	s = s.replace( /\s*face="[^"]*"/gi, '' ) ;
	s = s.replace( /\s*face=[^ >]*/gi, '' ) ;

	s = s.replace( /\s*FONT-FAMILY:[^;"]*;?/gi, '' ) ;

	// Remove Class attributes
	s = s.replace(/<(\w[^>]*) class=([^ |>]*)([^>]*)/gi, "<$1$3") ;

	// Remove styles.
//	s = s.replace( /<(\w[^>]*) style="([^\"]*)"([^>]*)/gi, "<$1$3" ) ;

	// Remove style, meta and link tags
	s = s.replace( /<STYLE[^>]*>[\s\S]*?<\/STYLE[^>]*>/gi, '' ) ;
	s = s.replace( /<(?:META|LINK)[^>]*>\s*/gi, '' ) ;

	// Remove empty styles.
	s =  s.replace( /\s*style="\s*"/gi, '' ) ;

	s = s.replace( /<SPAN\s*[^>]*>\s*&nbsp;\s*<\/SPAN>/gi, '&nbsp;' ) ;

	s = s.replace( /<SPAN\s*[^>]*><\/SPAN>/gi, '' ) ;

	// Remove Lang attributes
	s = s.replace(/<(\w[^>]*) lang=([^ |>]*)([^>]*)/gi, "<$1$3") ;

	s = s.replace( /<SPAN\s*>([\s\S]*?)<\/SPAN>/gi, '$1' ) ;

	s = s.replace( /<FONT\s*>([\s\S]*?)<\/FONT>/gi, '$1' ) ;

	// Remove XML elements and declarations
	s = s.replace(/<\\?\?xml[^>]*>/gi, '' ) ;

	// Remove w: tags with contents.
	s = s.replace( /<w:[^>]*>[\s\S]*?<\/w:[^>]*>/gi, '' ) ;

	// Remove Tags with XML namespace declarations: <o:p><\/o:p>
	s = s.replace(/<\/?\w+:[^>]*>/gi, '' ) ;

	// Remove comments [SF BUG-1481861].
	s = s.replace(/<\!--[\s\S]*?-->/g, '' ) ;

	s = s.replace( /<(U|I|STRIKE)>&nbsp;<\/\1>/g, '&nbsp;' ) ;

	s = s.replace( /<H\d>\s*<\/H\d>/gi, '' ) ;

	// Remove "display:none" tags.
	s = s.replace( /<(\w+)[^>]*\sstyle="[^"]*DISPLAY\s?:\s?none[\s\S]*?<\/\1>/ig, '' ) ;

	// Remove language tags
	s = s.replace( /<(\w[^>]*) language=([^ |>]*)([^>]*)/gi, "<$1$3") ;

	// Remove onmouseover and onmouseout events (from MS Word comments effect)
	s = s.replace( /<(\w[^>]*) onmouseover="([^\"]*)"([^>]*)/gi, "<$1$3") ;
	s = s.replace( /<(\w[^>]*) onmouseout="([^\"]*)"([^>]*)/gi, "<$1$3") ;

	// The original <Hn> tag send from Word is something like this: <Hn style="margin-top:0px;margin-bottom:0px">
	s = s.replace( /<H(\d)([^>]*)>/gi, '<h$1>' ) ;

	// Word likes to insert extra <font> tags, when using MSIE. (Wierd).
	s = s.replace( /<(H\d)><FONT[^>]*>([\s\S]*?)<\/FONT><\/\1>/gi, '<$1>$2<\/$1>' );
	s = s.replace( /<(H\d)><EM>([\s\S]*?)<\/EM><\/\1>/gi, '<$1>$2<\/$1>' );

	return s;
};

$.fn.deepSerializeArray = function(){
	var ret = [];
	$.each(this.deepSerialize(), function(n, v){
		ret.push({name: n, value: v});
	});
	return ret;
};

$.fn.deepSerialize = function(){
	var ret = {}, re = /^([^\[]+)\[([^\]]+)\]\[?([^\]]*)\]?$/, r, n, k, k2;
	$.each(this.serializeArray(), function(){
		if(!re.test(this.name))
			ret[this.name] = this.value;
		else {
			r = re.exec(this.name);
			n= r[1];
			k = r[2];
			k2 = r[3];
			
			if(isFinite(k)){
				var i = parseInt(k,10);

				if((i || i === 0))
					k = i;
			}
			ret[n] = ret[n] || (i || i === 0 ? [] : {});
			
			if(k2){
				ret[n][k] = ret[n][k] || {};
				ret[n][k][k2] = this.value;
			} else
				ret[n][k] = this.value;
		}
	});
	return ret;
};

$.fn.editIconAfter = function(func, margin){
	margin = margin || '20px';
	
	return this.css('margin-right', margin).each(function(){
		var me = this;
		
		$('<div class="action-icons"><a href="#" title="' + $.lang('_EDIT') + '" class="ui-icon ui-icon-pencil"></a></div>')
			.insertAfter(this).find('a').click(function(){
				func.call(me, $(this).hide());
				return false;
			});
	});
};

//Helpers

function emptyLabel(){
	return '<i class="ui-state-disabled">(' + $.lang('empty') + ')</i>';
}

function formTr($t, caption, desc, req){
	return $('<tr><td><div class="formcaption' + (req ? ' required' : '') + '">' + $.lang(caption) +'</div>'
		+ (desc ? '<div class="formdesc">' + desc + '</div>' : '')
		+ '</td><td><div class="formfield"></div></td></tr>')
			.appendTo($t).find('.formfield');
	
}

function optVal2Text(val, opt){
	var ret;
	if($.isArray(val)){
		var text = [];
		$.each(val, function(){
			text.push(opt[this] ? opt[this] : this);
		});
		ret = text.join(', ');
	} else
		ret = opt[val] || val;
	return ret || emptyLabel();
}

function getCountries(){
	if(!euca.countries){
		$.ajax({
			data: {classname: 'geo', method: 'countryList'},
			async: false
		}).done(function(d){euca.countries = d;});
	}
	
	return euca.countries;
}

//Tmp solution. Todo: remove call in item_admin.js
$.optVal2Text = optVal2Text;

})(jQuery);