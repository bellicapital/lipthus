/**
 * Created by jj on 22/6/16.
 */
"use strict";

$.contentReady(function(){

	var curItem;

	const onsubmit = function(e){
		e.preventDefault();

		$popup.popup('close');

		const val = this.param.value;

		if(curItem.val === val)
			return;

		$.ajax({
			url: '/form/uri/' + curItem.id + '/set',
			data: {name: curItem.name, value: val},
			type: 'post'
		}).done(function(d){
			if(d === true)
				curItem.td.innerHTML = val;
		});
	};

	const $popup = $('#popup-param-edit');
	const $param = $('#param');
	const $charcount = $('#charcount');

	const onclick = function(){
		$popup;
		curItem = {
			id: this.parentNode.dataset.id,
			val: this.innerHTML,
			name: this.dataset.name,
			td: this
		};

		$charcount.html(this.innerHTML.length);
		$param.val(curItem.val);
		$popup.width(Math.min(window.innerWidth * .9, 700)).popup('open');
		$param.focus();
	};

	$param.keyup(function(){
		$charcount.html($param.val().length);
	});

	$('#uris').find('td').click(onclick);

	$('#val-form').submit(onsubmit);

	$('#lang-selector').change(function(e){
		location.search = "?lang=" + $(this).val();
	});
});