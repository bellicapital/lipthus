/**
 * Created by jj on 12/7/16.
 */

$(function(){
	"use strict";

	var $as = $('#head-list').find('a');
	var count = 0;

	var lang = $('#lang-selector')
		.change(function(e){
			location.search = "?lang=" + $(this).val();
		})
		.val();

	function doNext(){
		var $a = $as.eq(count++);
		var a = $a[0];

		if(!a)
			return;

		$.ajax({
			url: "/heads",
			data: {
				uri: a.innerText,
				lang: lang
			},
			success: function(d){
				$a.parent()
					.next()
					.html("<p><b>Title: </b>"+d.title + "</p><p class='udesc'><b>Meta description: </b>"+d.description + "</p>")
					.trigger('heads-loaded', [a.innerText]);

				doNext();
			}
		})
	}

	doNext();
});