"use strict";

(function($, euca){

	var pendingRequests = 0;

function MobileForm($form, options){
	this.$f = $form;
	this.types = {};
	this.change = $.noop;

	//itemid, schema, languages
	$.extend(this, $form[0].dataset);

	if(this.languages)
		this.languages = JSON.parse('["' + this.languages.split(',').join('","') + '"]');
	else
		this.languages = euca.langs && Object.keys(euca.langs) || [];

	$.extend(this, options);

	var server = euca.server || location.host;

	$form.data('mobileform', this)
		.submit(function(e){
			e.preventDefault();
			e.stopPropagation();
			return false;
		});


	if(this.schema){
		this.url = '//' + server + '/form/' + this.schema;

		if(!this.itemid || this.itemid === 'sessionform')
			this.customControl || this.tmpFormInit();
		else
			this.url += '/' + this.itemid;
	}

	this.setLangSelector();

	this.setupFields();
}

MobileForm.prototype.tmpFormInit = function(){
	var self = this;

	this.$f.find('input[type="file"][accept^="video"]')
		.after('<p>Los videos se podr&aacute;n subir una vez creada la ficha.</p>')
		.remove();

	$.ajax({
		url: this.url + '/get',
		success: function(d){
			if(!d) return;

			self.set(d);
		}
	});

	self.$f.submit(function(){
		self.validate(function(){
			$.ajax({
				url: self.url + '/submit',
				data: {extra: self.extra},
				type: 'post'
			}).done(function(d){
				if(d.error){
					alert(d.error);
				} else {
					self.$f.trigger('onSubmit', [d]);

					//(in dataset)
					if(self.onsubmitRedirect === "true")
						window.location.href = d._id;
					else if(self.onsubmitRedirect)
						window.location.href = self.onsubmitRedirect.replace('__ID__', d._id);
				}
			});
		});
	});
};

MobileForm.prototype.validate = function(cb){
	var required
	,	$f = this.$f
	,	checked = {}
	,	val;

	$f.find('[data-required="true"]').each(function(){
		if(this.type === 'radio' || this.type === 'checkbox'){
			if(checked[this.name])
				return;

			val = !!$f.find('[name="' + this.name + '"]:checked').size();

			checked[this.name] = true;
		} else
			val = $(this).val() !== '';

		if(!val){
			required = this.name;

			var title = $(this).parents('fieldset:first').data('caption') || $(this).attr('placeholder');

			if(!title)
				title = $(this).parents('li:first').find('label').html();

			$.alert('<i>' + title + '</i> es obligatori@');

			return false;
		}
	});

	if(!required)
		cb();
};

MobileForm.prototype.setLangSelector = function(){
	var self = this;
	var $langSel = $('.lang-selector');

	if(!$langSel.size())
		return;

	var curlang = euca._LANGCODE;
	var hash = location.hash.substr(1);

	if(hash && euca.langs[hash])
		curlang = hash;

	$.each(this.languages, function(){
		$langSel.append(
			'<input type="radio" id="lang-choice-' + this + '" name="lang" value="' + this + '"/>'
			+ '<label for="lang-choice-' + this + '">' + euca.langNames[this] + '</label>'
		);
	});

	$langSel.controlgroup('destroy').controlgroup().find('input').change(function(){
		self.changeLang(this.value);
		location.hash = this.value;
	}).filter('#lang-choice-' + curlang).prop("checked", true).checkboxradio('refresh');

	self.changeLang(curlang);
};

MobileForm.prototype.changeLang = function(code){
	var $mls = this.$f.find('[lang="' + code + '"]').show();
	this.tinymce($mls);
	this.$f.find('[lang][lang!="' + code + '"]').hide();
	this.$f.trigger('langChange', [code]);
};

MobileForm.prototype.tinymce = function($mls){
	if(!window.tinymce)
		return;

	tinymce.remove();

	$mls.each(function(){
		if(!this.dataset.editor)
			return;

		if(!this.id)
			this.id = "ed_" + Date.now();


		tinymce.init({
			selector: '#' + this.id,
			height: 400,
			plugins: [
				'advlist autolink lists link image charmap print preview anchor',
				'searchreplace visualblocks code fullscreen',
				'insertdatetime media table contextmenu paste code'
			],
			toolbar: 'insertfile undo redo | styleselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image',
			setup : function(ed) {
				//actualiza el textarea al editar
				ed.on('change', function(e) {
					$(ed.targetElm).val(ed.getContent()).change();
				});
			}
		});
	});
};

MobileForm.prototype.set = function(obj){
	var self = this;

	if(typeof obj === 'string'){
		var tmp = {};
		tmp[obj] = arguments[1];
		obj = tmp;
	}

	$.each(obj, function(n,v){
		if(!self.types[n])
			return;

		var $field = self.$f.find('[name="' + n + '"]');

		switch(self.types[n]){
			case 'multilang':
				$.each(v, function(c, v2){
					self.$f.find('[name="' + n + '.' + c + '"]').val(v2);
				});
				break;
			case 'file':
				v && $field.fileField('appendThumbs', v);
				break;
			case 'slider':
				$field.val([v]).slider('refresh');
				break;
			case 'radio':
				$field.filter('[value="' + v + '"]').prop("checked", true).checkboxradio('refresh');
				break;
			case 'checkbox':
				if(v){
					if($field.data().type === 'boolean')
						v = [true];

					$field.val(v).checkboxradio('refresh');
				}
				break;
			case 'date':
				$field.val(v && typeof v === 'object' ? v.toJSON().substr(0,10) : v);
				break;
			case 'datepicker':
				v && $field.date('setDate', typeof v === 'object' ? v : new Date(v));
				break;
			case 'select-one':
				$field.val([v]).selectmenu('refresh');
				break;
			case 'signature':
				if(v)
					$field.val(v.uri).signature('setImage');
				break;
			default:
				$field.val(v);
		}
	});
};

MobileForm.prototype.send = function(name, value, cb){
	if(!this.url)
		return cb && cb.call(this);

	pendingRequests++;

	$.ajax({
		url: this.url + '/set',
		data: {name: name, value: value},
		type: 'post',
		error: function(){
			alert('ha ocurrido un error');


		}
	}).done(function(d){
		pendingRequests--;

		if(d.error){
			$.error(d.error);
			alert(d.error);
		}

		cb && cb.call(this, d);
	});
};

MobileForm.prototype.setupFields = function(){
	var self = this;

	this.$f.find('input,select,textarea').each(function(){
		var $field = $(this),
			$c = $field.parent();

		if(this.dataset.multilang){
			if(this.dataset.enhanced === 'true' || $field.attr('lang')){
				self.types[this.name.replace(/\..+$/, '')] = 'multilang';
			} else {
				self.types[this.name] = 'multilang';

				var val = this.dataset.value;

				if(val){
					var arr = val.split(',');

					val = {};

					arr.forEach(function(v,i){
						v = v.split(':');
						val[v[0]] = v[1];
					});
				} else
					val = {};

				$.each(self.languages, function(){
					var name = $field.attr('name'),
						$lang = $field.clone();

					$lang.attr('name', name + '.' + this)
						.attr('lang', this)
						.attr('placeholder', ($field.attr('placeholder') || '') + ' (' + euca.langNames[this] + ')')
						.val(val[this] || '')
						.appendTo($c);
				});

				$field.hide();
			}
		} else if(this.dataset.role === 'date'){
			self.types[this.name] = 'datepicker';

			var opt = $.extend({}, this.dataset);

			opt.onSelect = function(date, ui){
				$(this).trigger('change');
			};

			$field.date(opt);

			if(this.value && !this.dataset.dateFormat){
				var date = new Date(this.value);

				if(date)
					$field.date('setDate', date);
			}
		} else if(this.dataset.role === 'signature'){
			self.types[this.name] = this.dataset.role;

			$(this).signature();
		} else {
			self.types[this.name] = this.dataset.role || this.type;

			if(this.type === 'file')
				$(this).fileField({
					schema: self.schema,
					itemid: self.itemid,
					field: this.name
				});
		}
	});
};

MobileForm.prototype.removeMedia = function(fieldDom, cb){
	var self = this;
	var $fieldDom = $(fieldDom);
	var msg = $fieldDom.attr('title');
	var field = fieldDom.dataset.field;
	var url = this.url;

	if(this.customControl){
		var input = $fieldDom.data().input;

		if(input.dataset.itemid)
			url += '/' + input.dataset.itemid;
	}

	$.confirm(msg, function(){
		$.ajax({
			url: url + '/unset',
			data: {name: field},
			type: 'post'
		}).done(function(d){
			if(d.error){
				$.error(d.error);
				$.alert(d.error);
			}

			cb && cb.call(this, d);
		});
	});
};

MobileForm.prototype.sortUpdate = function(field, cb){
	var self = this,
		$input = $(field),
		$gal = $input.data('fileField').gallery,
		data = {
			name: field.name,
			keys: []
		},
		re = new RegExp('\\/' + field.name + '\\.(\\d+)');

	$gal.children().each(function(){
		var path = $(this).data('thumb').path;

		if(!path) return false;

		var m = path.match(re);

		if(!m) return false;

		data.keys.push(m[1]);
	});

	if(data.keys.length !== $gal.children().size())
		return $.error(field.name + ' not sortable');


	$.ajax({
		url: self.url + '/sortfield',
		data: data,
		type: 'post'
	}).done(function(d){
		if(d.error){
			$.error(d.error);
			$.alert(d.error);
		}

		cb && cb.call(self, d);
	});
};

//function MobileFormElement(d){
//
//}

var methods = {
	init: function(options){
		if(this.data('mobileform'))
			return;// console.warn('mobileform already inited');

		return this.each(function(){
			var $form = $(this),
				form = new MobileForm($form, options),
				formDom = this;

			if(form.customControl)
				return;

			$form.change(function(e){
				var ele = e.target;
				var $ele = $(ele);
				var val;
				var name = ele.name;

				if(!name)
					return;

				if(ele.type === 'checkbox'){
					if(ele.dataset.type === 'boolean')
						val = ele.checked;
					else {
						val = [];

						$.each($form.find('[name="' + name + '"]:checked'), function(){
							val.push(this.value);
						});
					}
				} else if(form.types[name] === 'datepicker'){
					if(ele.value)
						val = $ele.date('getDate').toDateString();
				} else if(form.types[name] === 'number'){
					val = parseFloat(ele.value) || 0;

					$ele.val(val);
				} else
					val = $ele.val();

				ele.blur();

				form.send(name, val, function(d){
					$.mobile.loading('hide');

					if(d === true) {
						e.changed = {};
						e.changed[name] = val;
						form.change.call(formDom, e);
					} else {
						alert('Error')
					}
				});
			});
		});
	},
	set: function(obj){
		return this.each(function(){
			var $form = $(this),
				form = $form.data('mobileform');

			form.set(obj);
		});
	},
	setExtra: function(extra){
		return this.each(function(){
			var data = $(this).data('mobileform');

			if(!data)
				return $.error('mobileform not inited');

			data.extra = extra;
		});
	}
};

$.fn.mobileForm = function(a, b, c){
	if(typeof a === 'string')
		return methods[a].call(this, b, c);
	else
		return methods.init.call(this, a);
};

$.contentReady(function(){
	var $mf = $('form[data-role="objectform"]').mobileForm(),
		mf = $mf.data('mobileform');

	$mf.on('sortupdate', 'input[type="file"]', function(){
		mf.sortUpdate(this);
	});

	// evita que se muestre un calendario al cargar la página. jj 21/5/15 - jqm 1.4.5
	$('head').append('<style>#ui-datepicker-div{display:none}</style>');
});

// impide salir de la ventana si hay una acción pendiente
	window.onbeforeunload = function(e) {
		// si el foco está en un textarea, lo quitamos para que si hay cambio se inicie una petición ajax
		if(document.activeElement.tagName === 'TEXTAREA')
			$(document.activeElement).blur();

		// si no hay nada pendiente, no hay mensaje
		if (!pendingRequests)
			return;

		// el cuerpo del mensaje es inútil, pero ponemos algo por si acaso. Al menos en chrome - jj
		var s;

		s = "Espera a que se hayan guardado los cambios";

		e.returnValue = s;

		return s;
	}

})(jQuery, euca);
