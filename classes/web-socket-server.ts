import {Server as WebSocketServer, ServerOptions} from "ws";
import {LipthusRequest} from "../index";
import * as debug0 from "debug";
import * as WebSocket from "ws";

const debug = debug0('site:listen');


export class LipthusWebSocketServer extends WebSocketServer {

	constructor (options?: ServerOptions, callback?: () => void) {
		super(options, callback);

		this.on("connection", (ws: WebSocket | any, req: LipthusRequest) => {
			debug('wss connected');

			ws. created = new Date();
			ws.upgradeReq = req;

			ws.json = (json: any) => ws.send(JSON.stringify(json));

			ws.json({info: 'ws connected'});

			ws.on('message', (m: string) => {
				try {
					m = JSON.parse(m);
					ws.emit('json', m);
				} catch (e) {}
			});
		});
	}

	broadcast (data: any, path: string) {
		this.getClients(path).forEach((client: any) =>
			client.send(JSON.stringify(data), (err: Error) => err && console.error(err))
		);
	}

	getClients (path: string): Array<WebSocket> {
		return [...this.clients].filter((client: any) => client.upgradeReq.url.match(path));
	}
}
