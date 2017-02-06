$.fn.langSelector = function(options){
	var s = $.extend({
		def: euca._LANGCODE,
		format: 'auto',
		langs: euca.langs,
		auto: false,
		formclass: 'ui-widget-content ui-state-highlight ui-corner-all',
		change: function(lang){
			var exdate = new Date();
			exdate.setDate(exdate.getDate() + 365);
			document.cookie = 'hl=' + lang + ';expires=' + exdate.toUTCString();
		},
		logicDestroy: true	//If lang count < 2 remove element
	}, options);
	if(s.logicDestroy && $.count(s.langs) < 2)
		return this.remove();

	return this.addClass('langSelector').each(function(){
		var $me = $(this), $form = $('<form action="javascript:;">').appendTo(this);
		var data = {val: s.def, settings: s};
		$me.data('langSelector', data);
		
		if(s.format === 'radio' || (s.format === 'auto' && ($.count(s.langs) < 10))){
			$form.addClass(s.formclass);
			
			$.each(s.langs, function(code, name){
				$form.append('<label><input type="radio" name="langsel" value="' + code + '"/>' + name + '</label>');
			});
			
			$('input:radio', $form).click(function(){
				if(data.val === this.value)
					return;

				data.val = this.value;
				s.change.call($me[0], this.value);
				$me.trigger('langChanged', [this.value]);
			});
		} else {
			var $sel = $('<select name="langsel"></select>').appendTo($form);
			
			$.each(s.langs, function(code, name){
				$sel.append('<option value="' + code + '">' + name + '</option>');
			});
			
			$sel.change(function(){
				data.val = $(this).val();
				s.change.call($me[0], data.val);
				$me.trigger('langChanged', [data.val]);
			});
		}
		
		$form.find('[name="langsel"]').val([s.def]);

		//$me.bind('change', function(e, val){$form.find('input:radio[value=' + val + ']').click();});

		if(!s.form) return;

		// Habilita la traducción automática para el formulario
		var $translateLk = $('<div style="display: none; text-align: center; margin-top: 10px;"></div>').appendTo(this);
		$me.bind('gTranslate', function(){
			var curLangCode = $('input:radio:checked', $me)[0].value;
			$('[id$="\[' + curLangCode + '\]"]', s.form).each(function(){
				var value, $target;
				if(this.tagName === 'IFRAME'){
					$target = $(this).contents().find('body');
					value = $target.html().replace(/<br>$/, '');
				} else {
					value = this.value;
					$target = $(this);
				}
				if(value) return;//Retorna en el caso que el campo ya tenga contenido

				//Obtiene el valor del mismo campo del idioma por defecto
				var mainEle = document.getElementById(this.id.replace(/\[\w+\]/, '['+euca.deflang+']'));
				var text = mainEle.tagName === 'IFRAME' ? $(mainEle).contents().find('body').html() : $(mainEle).val();

				//Si hay texto en el idioma principal, lo traduce
				text && $target.translate({
					from: euca.deflang,
					to: curLangCode,
					text: text
				});
			});
		});
		$('<a href="javascript:;">Traducir del<br/>' + s.langs[euca.deflang] + '</a>').appendTo($translateLk).click(function(){$translateLk.trigger('gTranslate');});

		$me.bind('langChanged', function(e,code){
			$.each(s.langs, function(langcode, langname){
				var $ele = $('[rel="' + langcode + '"]', s.form);
				if(code === langcode)
					$ele.show();
				else
					$ele.hide();
			});
			if(code === euca.deflang)
				$translateLk.hide();
			else {
				$translateLk.show();
				s.auto && $translateLk.trigger('gTranslate');
			}
		});
	});
};