"use strict";

$(function(){
	$('.comment-actions-btn').click(function(){
		$('.comment-id').val($(this).parents('li:first')[0].id);
		$('#answer').val('');
	});

	$('#answer-btn').click(function(){
		$('#status-popup').popup('close');
		setTimeout(function(){$('#answer-popup').popup('open')}, 200);
	});

	var $comments = $('#comments');

	$comments.on('click', '.ui-icon-edit', function(){
		var db = $comments[0].dataset.db;
		var $li = $(this).closest('li');
		var id = $li.attr('id');
		var $text = $li.find('.text');
		var text = $text.html();

		$.prompt({
			message: 'Modificar texto',
			value: text,
			fieldType: 'textarea',
			complete: function(newText){
				if(newText && text === newText)
					return;

				$.ajax({
					url: '/form/' + db + '.comment/' + id + '/set',
					type: 'post',
					data: {
						name: 'text',
						value: newText
					}
				}).done(function(d){
					if(d === true)
						$text.html(newText);
					else
						$.alert(d);
				});
			}
		});
	});
});