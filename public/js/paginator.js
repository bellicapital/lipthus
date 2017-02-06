$.fn.paginator = function(options){
	var o = $.extend({
		limit: 20
	}, options);

	return this.addClass('paginator').each(function(){
		if(!o.count || !o.data) return;

		var n = o.count / o.limit,
			$me = $(this);

		if(o.count % o.limit)
			n++;

		for(var i = 1; i<=n; i++){
			$me.append('<a href="#">' + i + '</a> ');
		}

		$me.find('a').click(function(e){
			e.preventDefault();

			var $a = $(this);

			if($a.attr('disabled'))
				return;

			$me.find('a').attr('disabled', false).removeClass('ui-state-disabled');
			$a.attr('disabled', true).addClass('ui-state-disabled');

			o.data.a[o.limitArgPosition] = o.limit;
			o.data.a[o.skipArgPosition] = $a.index() * o.limit;

			$.ajax({
				data: o.data
			}).done(o.done);
		}).eq(0).click();

		if(o.count <= o.limit)
			$me.hide();
	});
};