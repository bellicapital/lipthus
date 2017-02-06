(function($){
	

function SiteError(d){
	$.extend(this, d);
	
	this.last = new Date(this.last || this.created);
}

SiteError.prototype.html = function(tag){
	tag = tag || 'div';
	
	var ret = '<' + tag + '><a class="show-stack">' + this.url;
	
	if(this.method !== 'GET')
		ret += ' (' + this.method  + ')';
	
	if(this.repeated)
		ret += ' (' + this.repeated  + ')';
	
	if(this.referer)
		ret += '<p>Referer: ' + this.referer  + '</p>';
	
	if(this.device)
		ret += '<p class="err-details">' + this.device + ' · ' + JSON.stringify(this.ipLocation) + '</p>';
	
	ret += '<p class="stack-trace" style="white-space:pre-wrap;height:1.2em">' + this.stack + '</p>';
		
	ret += '<span class="ui-li-count">' + this.last.toLocaleDateString() + '</span>'
		+ '</a><a href="' + this.url + '" target="_blank"></a>';//</' + tag + '>';

	return $(ret);
};

$.fn.logErrors = function(){
	var me = this;

	if(this.attr('id') !== 'miscErrorsTable')
		$('#miscErrorsTable').remove();

	$.ajax({
		data: {cl: 'admin', m: 'errors', a: $.args({limit: 40})},
		success: function(d){
			if(d.length){
				var $t = $('<ul id="miscErrorsTable" data-role="listview" data-inset="true">').appendTo(me);
				
				$.each(d, function(){
					var err = new SiteError(this);
					
					$t.append(err.html('li'));
				});
				
				$t.listview().on('click', '.show-stack', function(){
					$(this).find('.stack-trace').css('height', 'auto').end().find('.err-details').show();
				});
			} else
				$('<h4><i>No se han registrado errores en el lado servidor</i></h4>').appendTo(me).highlighted();

			$('#adm_misc').find('[href="admin#misc|Errors"] span').html(' (' + d.length + ')');

			return this;
		}
	});
};

})(jQuery);