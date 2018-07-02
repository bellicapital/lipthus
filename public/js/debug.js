

$.debugSelector = function(){
	var $debugSel = $('#debugSel');

	if($debugSel.size())
		return $debugSel.show().focus();

	$debugSel = $('<select id="debugSel" class="ui-widget-content ui-corner-bottom ui-state-error">')
		.change(function(){
			$.aj('Logger', 'setSessionDebugLevel', [$(this).val()], function(){
				if(location.search){
					var search = location.search.replace(/debug=\d/, '');
					location.search = search === '?' ? '' : search;
				} else
					location.reload();
			});
		});

	$.each([
		'no debug | minify',
		'no console | minify',
		'console | minify',
		'console | no minify | verbose',
		'console | no minify',
		'iApple | custom. Test porpouses'
	], function(n,v){
		$debugSel.append('<option value="' + n + '">' + n + ' - ' + v + '</option>');
	});

	$debugSel.blur(function(){
		$debugSel.slideUp();
	});

	return $debugSel.prependTo('body').val(euca.debug).focus();
};

$.ajaxSetup({
	complete: function(a){
		var c = window.console;
		if(!c) return;
		var r = a.getResponseHeader('console');
		if(!r) return;
		$.each($.parseJSON(r), function(t,m){
			$.each(m, function(a,b){
				c[t](b);
				if(t === 'error' || t === 'warn'){
					$('#euca-errors').append('<pre class="etype_' + t + '">' + b + '</pre>');
					$('#logger_errors').click().button('option', 'label', 'errors (' + $('#euca-errors').children().size() + ')');
				}
			});
		});
	}
});

$.jsLoaded(function(){
	$(window).keypress(function(e){
		if(e.shiftKey || e.altKey || e.metaKey || e.ctrlKey)
			return;

		var char_ = String.fromCharCode(e.keyCode || e.charCode);

		if(char_ === 'ð'){
			e.preventDefault();
			e.stopImmediatePropagation();

			$.debugSelector();
			return false;
		}
		return;

		if(parseInt(char_,10) < 6)
			$('#debugSel:visible').val(char_).change();
	});


	//Debug console
	var $form = $('#error-tabs form');
	$form.find('input').attr('checked', false);
	$.fn.buttonset && $form.buttonset().find('input').change(function(){
		var id = this.id;
		if(id === 'logger_close'){
			$('#error-output').remove();
			var date = new Date();
			date.setTime(date.getTime() - 1000);
//			document.cookie = "debug=;path=/;domain=." + location.hostname.replace(/^\w+\.(\w+\.\w+)/, '$1') + "; expires="+date.toUTCString();
		} else {
			var $visibles = $('#error-output > div:visible:not(#error-tabs)');
			if($visibles.size())
				$visibles.slideUp(showLoggerTab);
			else
				showLoggerTab();
		}

		function showLoggerTab(){
			var $c = $('#' + (id.replace('logger_', 'euca-')));
			$c.html() && $c.slideDown();
		}
	});

	if($.fn.button)
		$('#logger_close').button('option', 'icons', {primary: 'ui-icon-power'}).button('option', 'text', false);

	if($('#euca-errors > *').size())
		$('#logger_errors').click();
});
