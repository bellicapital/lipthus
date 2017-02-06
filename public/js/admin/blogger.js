"use strict";

$(function(){
	var $postForm = $('#postForm');
	var data = $postForm.data();
	var schema = data.schema;
	var itemid = data.itemid;

	$('body').on('click', '.blog-delete', function(e){
		e.preventDefault();

		if(!confirm("¿Eliminar definitivamente este post?"))
			return;


		$.ajax({
			data: {
				schema: schema,
				m: 'remove',
				id: itemid
			}
		}).done(function(){
			location.href = '/blogger/' + schema;
		});

		return false;
	});

	// añadir a la próxima newsletter
	$postForm.find('[name="active"]').change(function(){
		if(!this.checked)
			return;

		if(!itemid || itemid === 'sessionform')
			return;

		// si hace más de seis días, no se añade
		var published = new Date($('#postForm').find('[name="published"]').val()).getTime();

		if(!published || published < (Date.now() - (6 * 24 * 3600000)))
			return;

		$.ajax({
			data: {
				p: 'newsletter',
				m: 'addItem',
				a: [{
					col: schema,
					itemid: itemid,
					event: 'created'
				}]
			},
			type: 'post'
		}).done(function(d) {
			if (d.error)
				return $.alert(d.error);

			console.log(d);
		});
	});
	
	//fuerza minúsculas en url
	$postForm.find('[name="url"]').keyup(function(){
		this.value = this.value.toLowerCase()
			.replace(/[àáâãäå]/g, 'a')
			.replace(/[èéêë]/g, 'e')
			.replace(/[ìíîï]/g, 'i')
			.replace(/[òóôõö]/g, 'o')
			.replace(/[ùúûü]/g, 'u')
			.replace(/[^\w\d]/g, '-');
	});

	$postForm.find('[name^="description."]').change(function(){
		var $pl = $('#post-link');

		if(!$pl.size())
			return;

		var uri = $pl.attr('href');

		$.ajax({
			data: {
				cl: 'w3c',
				m: 'ajaxErrorCount',
				a: [uri, 0]
			}
		}).done(function(d){
			$('#desc-errors').show().find('a').html(d.count).css('color', d.count?'orangered':'green');
		});
	});

	$postForm.find('[name^="metaTitle."],[name^="metaDescription."]').keyup(function() {
		$('#' + this.name.replace(/\.\w+$/, '') + '-counts')
			.html(this.value.length + ' de ' + this.dataset.maxlength)
			.css('color', this.value.length > this.dataset.maxlength ? 'orangered' : 'gray');
	});

	$postForm.bind('langChange', function(e, code){
		$postForm.find('[name="description.' + code + '"]').change();
		$postForm.find('[name="metaTitle.' + code + '"],[name="metaDescription.' + code + '"]').keyup();
	});
});