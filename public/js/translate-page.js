$(function() {
	$.mobile.ajaxEnabled = false;
	
	$('#langSel').change(function(){
		var href = location.pathname.replace(/(\/translate\/)\w{2}(.*)$/, '$1' + $(this).val() + '$2');
		
		//Sin esto, falla en chrome. jj, 3-2-15
		setTimeout(function(){
			location.href = href;
		}, 200);
	});

	var $fieldForm = $('#fieldForm');

	$fieldForm.find('[type="checkbox"]').change(function(){
		var $me = $(this);
		
		var r = location.pathname.match(/^\/translate\/(\w{2})\/([^\.]+)\.([^\/]+)\/([^\/]+)$/);

		if(!r)
			return false;
		
		var k = {
			to: r[1],
			dbname: r[2],
			colname: r[3],
			itemid: r[4],
			field: this.name
		};

		$.ajax({
			data: {
				s: 'translated',
				m: 'switch',
				a: $.args(k, 'uid', $me.prop("checked"))
			},
			type: 'post'
		});
	});

	$fieldForm.find('textarea').change(function(){
		var $me = $(this)
		,	name = this.name
		,	val = $.trim($me.val());
		
		var r = location.pathname.match(/^\/translate\/([^/]+)\/([^\/]+)\/([^\/]+)$/);
		
		if(!r)
			return false;

		var update = {};

		update[name + '.' + r[1]] = val;
		
		$.ajax({
			url: '/form/' + r[2] + '/' + r[3] + '/set',
			data: {
				name: name + '.' + r[1],
				value: val
			},
			type: 'post'
		}).done(function(d){
			if(d && d.error)
				return alert(d.error);
			
			var $translated = $fieldForm.find('input[name="' + name + '"]')
			,	checked = $translated.prop('checked');
			
			if(checked !== !!val)
				$translated.parent().click();
		});
	});
	
	$('#active-sel').change(function(){
		document.cookie="translateAll="+!this.checked;
		location.reload();
	});

	$('#user-sel').change(function(){
		location.href = '?uid=' + this.value;
	});
});