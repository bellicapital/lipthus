//aún no se usa
(function($, euca){

$.fn.subscriptions = function(){
	var $me = this;
	
	$.ajax({
		data: {schema: 'subscription', m: 'tree'}
	}).done(function(d){
		var $list = $('<ul style="float:left">').appendTo($me);

		$('<ul id="subscription-list" style="float:left;border-left: 1px solid;border-right: 1px solid;margin:0 20px;padding:0 14px"></ul>')
			.appendTo($me)
			.on('click', 'a', clickSubscription);

		$('<ul id="subscription-details" style="float:left"></ul>')
			.appendTo($me);
		
		$.each(d, function(db){
			$.each(this, function(col){
				$list.append('<li><a href="#' + db + '.' + col + '">' + ($.H.handlers[col] && $.safeLang($.H.handlers[col].title) || col) + '</a></li>');
			});
		});

		$list.find('a').click(function(e){
			e.preventDefault();

			var key = $(this).attr('href').substr(1),
				split = key.split('.'),
				db = split[0],
				col = split[1];

			$.ajax({
				data: {schema: 'subscription', m: 'listCollection', a: [col, db]}
			}).done(drawList);
		});

		$list.menu();
	});

	return this;
};

function drawList(list){
	var $sl = $('#subscription-list').empty();
	
	$.each(list, function(){
		$sl.append('<li><a href="#' + this.id + '">' + this.email + '</a></li>');
	});
}

function clickSubscription(e){
	e.preventDefault();
	
	var $sd = $('#subscription-details').empty(),
		$a = $(this),
		id = $a.attr('href').substr(1),
		email = $a.text();

	$.ajax({
		data: {schema: 'subscription', m: 'get4show', id: id, req: 1}
	}).done(function(d){
		$.each(d, function(){
			$.each(this, function(type){
				if(!this.length) return;
				
				var $sul = $('<li><b>' + type + '</b><ul></li>').appendTo($sd).find('ul');
				
				$.each(this, function(){
					$sul.append('<li>' + (this.title || this) + '</li>');
				});
			});
		});
	});
}

})(jQuery, euca);
