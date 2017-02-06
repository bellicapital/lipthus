$(function(){
	$('#aprove-checkbox').change(function(){
		$.ajax({
			data: {
				schema: 'comment',
				id: $(this).attr('data-id'),
				m: 'approve',
				a: ['req', {active: this.checked}]
			},
			type: 'post'
		});
	});
});