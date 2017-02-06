$(function(){
	$('table.subscriptions .ui-icon-delete').click(function(){
		var $li = $(this).parent()
		,	p = this.dataset.path.split('.');
		
		$.ajax({
			data: {
				cl: 'subscriptor',
				m: 'ajaxRemoveUserItem',
				a: p
			},
			type: 'post'
		}).done(function(d){
			if(d.ok === true)
				$li.slideUp();
			else if(d.error)
				alert(d.error);
		});
	});
});