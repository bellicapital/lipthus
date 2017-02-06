"use strict";

$(function(){
	window.WebSocket = window.WebSocket || window.MozWebSocket;

	var conn = new WebSocket('ws://' + location.hostname + ':' + euca.port + location.pathname);

	conn.onmessage = function (message) {
		// try to decode json (I assume that each message from server is json)
		try {
			var json = JSON.parse(message.data);
		} catch (e) {
			console.log('This doesn\'t look like a valid JSON: ', message.data);
			return;
		}
		
		// handle incoming message
		if(json.err)
			console.error(json);
		
		if(json.info)
			console.info(json.info);
		
		if(json.host)
			draw(json);
	};
	
	var $t = $('#c').find('tbody');
	
	function mb(n){
		return Math.round(n/1048576 * 100) / 100 +'MB';
	}
	
	function draw(d){
		var $tr = $('#' + d._id);
		
		if(!$tr.size()){
			$tr = $('<tr id="' + d._id + '">').prependTo($t);
			
			$t.find('>tr:gt(50)').remove();
		} else
			$tr.empty();
		
		var device = d.device;
		
		if(!device)
			device = '...';
		else if(device === 'bot'){
			var match = d.agent.match(/blexbot|yandexbot|googlebot|bingbot|baiduspider|AhrefsBot|360spider|dotbot|yahoo/i);
			
			if(match)
				device = match[0];
		}
		
		$tr.append(
			'<td>' + d.host + '</td>' +
			'<td><a href="http://' + d.host + d.url + '" target="_blank">' + d.url + '</a></td>' +
			'<td>' + d.method + '</td>' +
			'<td>' + (d.code || '') + '</td>' +
			'<td>' + (d.referer ? '<a class="truncate" href="' + d.referer + '" target="_blank">' + d.referer + '</a>' : '') + '</td>' +
			'<td title="' + d.agent + '">' + device + '</td>' +
			'<td>' + (d.close || '') + '</td>' +
			'<td>' + (d.reqclose || '') + '</td>' +
			'<td>' + (d.finish || '') + '</td>' +
			'<td>' + (d.endmem && mb(d.endmem.rss-d.initmem.rss) || '') + '</td>' +
			'<td>' + (d.endmem && mb(d.endmem.rss) || '') + '</td>' +
			'<td>' + (d.cached ? '✔' : '') + '</td>'
		);
	}
});