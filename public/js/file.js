$(function(){
	$('#file-delete').click(function(){
		var id = this.dataset.id;
		
		$.confirm('Eliminar definitivamente este archivo', function(){
			$.ajax({
				data: {id: id, m: 'unlink', s: 'fsfiles'},
				type: 'delete'
			}).done(function(d){
				if(d === true)
					location.href = '/files';
				else
					$.alert(d);
			});
		});
	});
});