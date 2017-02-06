(function($){
	
$.fn.sessionForm = function(options){
	var o = $.extend({
		schema: null,
		extra: {},
		onSubmit: $.noop
	}, options);
	
	return this.each(function(){
		var $f = $(this);
		
		if($f.data('sessionForm'))
			return $.error('sessionForm already inited');
		
		$f.data('sessionForm', o);
		
		$.ajax({
			url: '//' + euca.server + '/sessionform/' + o.schema + '/get',
			success: function(d){
				if(!d) return;
				
				$.each(d, function(n,v){
					if(typeof v === 'object'){//multilang
						$.each(v, function(c, v2){
							$f.find('[name="' + n + '.' + c + '"]').val(v2);
						});
					} else {
						var $field = $f.find('[name="' + n + '"]');
						
						if($field.data('mobileSlider'))
							$field.val([v]).slider('refresh');
						else if($field.data('mobileCheckboxradio'))
							$field.val([v]).checkboxradio('refresh');
						else
							$field.val(v);
					}
				});
			}
		});
		
		$f.change(function(e){
			$.ajax({
				url: '//' + euca.server + '/sessionform/' + o.schema + '/set',
				data: {name: e.target.name, value: e.target.value},
				type: 'post'
			}).done(function(d){
				if(d.error){
					$.error(d.error);
					alert(d.error);
				}
			});
		}).submit(function(e){
			e.preventDefault();
			e.stopPropagation();
			
			$.ajax({
				url: '//' + euca.server + '/sessionform/' + o.schema + '/submit',
				data: {extra: options.extra},
				type: 'post'
			}).done(function(d){
				if(d.error){
					$.error(d.error);
					alert(d.error);
				} else
					o.onSubmit.call($f[0], d);
			});
		});
	});
};
	
})(jQuery);