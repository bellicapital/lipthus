$.fn.adminMaintenance = function(){
	var $me = this.addClass('ui-widget-content ui-corner-all').css({padding: 10});

	$.ajax({
		data: {classname: 'Maintenance', method: 'getStatus'}
	}).done(function(d){
		var $t = $('<table>').appendTo($me);
		$t.append('<tr><td>Cron:</td><td data="cron"' + (!d.cron ? ' class="ui-state-error"' : '') + '>' + bool2Icon(d.cron) + '</td></tr>');
		$t.append('<tr><td>Last:</td><td data="last" data-do="true"' + (!d.last ? ' class="ui-state-error"' : '') + '>' + (d.last || 'never') + '</td></tr>');

		$t.find('.ui-state-error, [data-do="true"]').css('cursor', 'pointer').click(function(){
			var $td = $(this);
			$.ajax({
				data: {classname: 'Maintenance', method: 'resolve', args: [$td.attr('data')]},
				type: 'post'
			}).done(function(val){
				if(typeof(val) === 'boolean')
					val = bool2Icon(val);
				
				$td.removeClass('ui-state-error').html(val);
			});
		});
	});

	function bool2Icon(b){
		return '<span class="ui-icon ui-icon-' + (b ? 'check' : 'alert') + '"></span>';
	}
};