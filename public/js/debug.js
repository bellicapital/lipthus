

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

	
	/* Test image */
	
	var $refBgImg = $('#refBgImg');
	
	if($refBgImg.size()){
		$refBgImg.appendTo('#container');
		
		$('body').css('min-height', $refBgImg.height()); //evita aparición y desaparión del scroll
		
		var top = /refBgImgTop=(\d+)/.exec(document.cookie);
		top = top ? top[1] + 'px' : 0;
		
		var left = /refBgImgLeft=(\d+)/.exec(document.cookie);
		left = left ? left[1] + 'px' : 0;
		
		var $c = $('<div class="ui-widget-content">')
			.appendTo('body')
			.css({
				position: 'absolute',
				padding: '8px',
				top: top,
				left: left,
				zIndex: 3,
				boxShadow: '3px 3px 3px #888'
			})
			.draggable({
				cursor: 'move',
				stop: function(e,ui){
					document.cookie = 'refBgImgTop=' + ui.position.top;
					document.cookie = 'refBgImgLeft=' + ui.position.left;
				}
			});
		
		$c.append('<span class="ui-icon ui-icon-arrow-4" style="margin:2px"></span><hr/>');
		
		var $checkbox=  $('<input type="checkbox" style="margin: 3px;"/>')
			.appendTo($c)
			.click(function(){
				$refBgImg.toggle();
				document.cookie = 'refBgImgShow=' + $refBgImg.is(':visible');
			});
			
		$c.append('<hr/>');

		var val = /refBgImg=(\d+)/.exec(document.cookie);
		val = val ? parseInt(val[1]) : 0;
		
		$refBgImg.css({
			opacity: val / 100,
			zIndex: 1
		});
		
		if(/refBgImgShow=true/.exec(document.cookie))
			$checkbox.click();
		
		$('<div></div>').appendTo($c).height(200).css({
			marginLeft: '4px'
		}).slider({
			orientation: "vertical",
			value: val,
			slide: function(e,ui){
				$refBgImg.css('opacity', ui.value / 100);
				document.cookie = 'refBgImg=' + ui.value;
				
				if(!ui.value || !$refBgImg.is(':visible'))
					$checkbox.click();
			}
		});
	}

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