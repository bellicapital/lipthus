$.tablesorter.addWidget({
	id: "jqueryui",
	format: function(table) {
		$(table).addClass('tablesorter');
		$('th', table.tHead).addClass('ui-widget-header').disableSelection().find('.ui-icon').remove();
		$('th.header', table.tHead).prepend('<span class="ui-icon ui-icon-triangle-2-n-s"></span>');
		$('.headerSortDown .ui-icon', table.tHead).addClass('ui-icon-circle-triangle-n').removeClass('ui-icon-triangle-2-n-s');
		$('.headerSortUp .ui-icon', table.tHead).addClass('ui-icon-circle-triangle-s').removeClass('ui-icon-triangle-2-n-s');
		$(table.tBodies).addClass('ui-widget-content');
		
		/*
		var $tr, row = -1, odd;
		// loop through the visible rows
		$("tr:visible",table.tBodies[0]).each(function (i){
			$tr = $(this);
			// style children rows the same way the parent row was styled
			if( !$tr.hasClass(table.config.cssChildRow) ) row++;
			odd = (row%2 == 0);
			$tr.removeClass(odd?'ui-state-default':'ui-state-hover').addClass(!odd?'ui-state-default':'ui-state-hover');
		});
		*/
	}
});