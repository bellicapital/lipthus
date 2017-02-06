$(function(){
	function doValidate(e, cb){
		var $count = $(this).parent().find('.ui-li-count')
		,	uri = decodeURIComponent(this.dataset.uri);
		
		$.mobile.loading('show', {
			text: uri.substring(uri.lastIndexOf('/') + 1),
			textVisible:true
		});
		
		$.ajax({
			data: {
				cl: 'w3c',
				m: 'ajaxErrorCount',
				a: uri
			}
		}).done(function(d){
			$.mobile.loading('hide');
			
			$count.html(d.count);
			
			cb && cb();
		});
	}
	
	var $validateBtns = $('.validate').click(doValidate);
	
	$('#refresh-all').click(function(){
		var count = 0
		,	btn;
		
		function doNext(){
			btn = $validateBtns.get(count++);
			
			btn && doValidate.call(btn, null, doNext);
		}
		
		doNext();
	});
});