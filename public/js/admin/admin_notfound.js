/* global google */

(function($){

var $popup;

$.fn.logNotFound = function(){
	var me = this;
	
	$.ajax({
		data: {cl: 'logger', m: 'notfoundArray'},
		success: function(e){
			if(e.length){
				var $ul = $('<ul id="miscNotFoundTable">').appendTo(me);
				
				e.forEach(function(a){
					$ul.append('<li><a href="' + a + '">' + a + '</a></li>');
				});
				
				$ul.on('click', 'a', function(e){
					e.preventDefault();
					$.mobile.loading('show');

					getPopup();

					$('#log-not-found-popup-url').attr('href', this.href).html(this.innerHTML);
					
					var $referers = $('#not-found-referers')
							.html('<p>' + $.lang('_FETCHING') + '</p>');
					
					$.ajax({
						data: {
							cl: 'logger',
							m: 'notfoundDetails',
							a: this.href
						},
						success: function(d){
							$.mobile.loading('hide');
							$referers.find('p').remove();
							
							var $t = $('<table style="text-align:center;font-size:10px"><tr><th>' + $.lang('_DATE') + '</th><th>Device</th><th>Ip</th><th>Referer</th></tr></table>')
									.appendTo($referers);

							d.forEach(function(r){
								$t.append('<tr><td>' + new Date(r.created).toLocaleDateString()
										+ '</td><td>' + r.device
										+ '</td><td>' + r.ipLocation.ip
										+ '</td><td>' + (r.referer ? '<a href="' + r.referer + '" target="_blank">' + r.referer + '</a>' : '-') +'</td></tr>');
							});

							$popup.popup('open');
						}
					});
				});
			} else
				$('<h4><i>No se han registrado p&aacute;ginas no encontradas en el lado servidor</i></h4>').appendTo(me).highlighted();

			return this;
		}
	});
};

function getPopup(){
	if($popup)
		return $popup;
	
	$popup = $('#log-not-found-popup');
	
	if($popup.size())
		return $popup;
	
	$popup = $('<div id="log-not-found-popup">\n\
			<a href="#" data-rel="back" class="ui-btn ui-corner-all ui-shadow ui-btn-a ui-icon-delete ui-btn-icon-notext ui-btn-right">Cerrar</a>\n\
			<ul data-role="listview" data-inset="true" data-divider-theme="b" data-theme="a" style="min-width:210px;">\n\
				<li><a id="log-not-found-popup-url"></a></li>\n\
				<li id="not-found-referers"></li>\n\
				<li data-icon="delete"><a id="log-not-found-popup-remove">' + $.lang('_DELETE') + '</a></li>\n\
			</ul>')
		.appendTo('body')
		.popup()
		.find('ul')
		.listview()
		.end();
	
	$('#log-not-found-popup-remove').click(function(){
		var uri = $('#log-not-found-popup-url').attr('href');
		
		$.ajax({
			data: {
				cl: 'logger',
				m: 'notfoundRemove',
				a: uri
			},
			type: 'post',
			success: function(){
				$popup.popup('close');
				
				$('a[href="' + uri + '"]').parent().slideUp();
			}
		});
	});
	
	return $popup;
}

})(jQuery);