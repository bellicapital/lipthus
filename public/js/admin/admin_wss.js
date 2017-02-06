$(function(){
	window.WebSocket = window.WebSocket || window.MozWebSocket;
	
	$.fn.adminWss = function(){
		var $me = this;
		
		$.ajax({
			data: {
				cl: 'admin',
				m: 'wss'
			}
		}).done(function(d){
			if(!Object.keys(d))
				return;
			
			var $t = $('<table id="wss-admin" style="text-align:center"><tr><th>Origin</th><th>Path</th><th>Version</th><th>Device</th><th>Key</th><th>Actions</th></tr></table>')
				.appendTo($me);
			
			$.each(d, function(path){
				$.each(this, function(){
					$t.append('<tr><td>'
						+ this.origin + '</td><td>'
						+ path + '</td><td>'
						+ this.version + '</td><td>'
						+ this.device + '</td><td>'
						+ this.key + '</td><td>'
						+ '<button data-action="connect" data-host="' + this.host + '" data-path="' + path
						+ '">Connect</button></td></tr>');
				});
			});
			
			var conn
			,	msg = 'Mira la c&oacute;nsola para ver los mensajes del socket'
			,	$send;
			
			$t.on('click', '[data-action="connect"]', function() {
				var button = this
				,	host = this.getAttribute('data-host')
				,	path = this.getAttribute('data-path');
				
				this.setAttribute('data-action', "disconnect");
				this.innerHTML = 'Disconnect';
				
				conn && conn.close();
				
				conn = new WebSocket('ws://' + host + path);
		
				conn.onmessage = console.log;
				
				conn.onopen = function(){
					console.info('socket open');
					
					$send = $('<button>send</button>').insertAfter(button).click(function(){
						$.prompt('Message', function(msg){
							
						});
					});
				};
				
				conn.onclose = function(){
					console.info('socket closed');
				};
				
				conn.onerror = function(e){
					console.info('socket error', e);
				};
				
				msg && $.alert(msg);
			});
			
			$t.on('click', '[data-action="disconnect"]', function(){
				this.setAttribute('data-action', "connect");
				this.innerHTML = 'Connect';
				
				conn.close();
				$send && $send.remove();
			});
		});
	
		return this;
	};
});