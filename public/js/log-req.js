const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const url = protocol + '://' + location.host + '/log-req';
const conn = new WebSocket(url);
const status = document.getElementById('status-text');
const logReq = document.getElementById('log-req');
let msgCount = 0;

conn.onmessage = m => {
	console.log(m.data);

	const json = JSON.parse(m.data);

	if (!json.url)
		return;

	if (msgCount++ > 100)
		logReq.innerHTML = '';

	logReq.innerHTML = '<table class="msg-box">'
		+ Object.keys(json).map(k => {
			// if (typeof json[k] === 'object')
			// 	json[k] = JSON.stringify(json[k]);

			return '<tr><td>' + k + '</td><td>' + json[k] + '</td></tr>';
		}).join('')

		+ '</table>' + logReq.innerHTML;
};

conn.onopen = _ => {
	status.innerText = 'open';
	console.log('conn open');
};

conn.onerror = err => {
	status.innerText = (err.message || err);
	console.log('conn error', err);
};

conn.onclose = _ => {
	status.innerText = 'closed';
	console.log('conn closed');
};
