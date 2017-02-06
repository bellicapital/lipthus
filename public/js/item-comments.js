/**
 * Created by jj on 30/8/16.
 */

$(function(){
	"use strict";



	function loaded(){
		var db = this.dataset.db;
		var schema = this.dataset.schema;
		var itemid = this.dataset.itemid;
		var $form = $(this).find('form.item-comment');

		function submitComment(e){
			e.preventDefault();

			var data = {
				schema: 'comment',
				m: 'submit',
				a: [
					'req',
					db,
					schema,
					itemid,
					this.name.value,
					this.email.value,
					this.comment.value
				]
			};

			$.ajax({
				data: data,
				type: 'post'
			}).done(function(d){
				if(d.error)
					return alert(d.error);

				if(d.id) {
					location.hash = '#comment-' + d.id;
					location.reload(true);
				}
			});
		}

		$form.submit(submitComment);
	}

	$('[data-role="comments"]').each(function(){
		$(this).load('/item-comments/' + this.dataset.schema + '/' + this.dataset.itemid, loaded);
	});
});