$(function(){
	"use strict";
	
	$('#tagsel').change(function (e){
		location.href= '/form-log/' + e.target.value + location.search;
	});
	
	$('.f-del').click(function(){
		if(!confirm('¿Eliminar este registro?'))
			return;

		var $tr = $(this).parents('tr:first');

		$.ajax({
			url: '/ajax',
			data: {
				id: this.dataset.id,
				m: 'remove',
				s: 'formlog'
			},
			type: 'post'
		}).done(function(d){
			if(d.error)
				return alert(d.error);

			$tr.remove();
		});
	});
});