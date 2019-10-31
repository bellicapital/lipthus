"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const debug0 = require("debug");
const debug = debug0('site:listen');
class LipthusWebSocketServer extends index_1.WebSocketServer {
    constructor(options, callback) {
        super(options, callback);
        this.on("connection", (ws, req) => {
            debug('wss connected');
            ws.created = new Date();
            ws.upgradeReq = req;
            ws.json = (json) => ws.send(JSON.stringify(json));
            ws.json({ info: 'ws connected' });
            ws.on('message', (m) => {
                try {
                    m = JSON.parse(m);
                    ws.emit('json', m);
                }
                catch (e) { }
            });
        });
    }
    // noinspection JSUnusedGlobalSymbols
    broadcast(data, path) {
        this.getClients(path).forEach((client) => client.send(JSON.stringify(data), (err) => err && console.error(err)));
    }
    getClients(path) {
        return [...this.clients].filter((client) => client.upgradeReq.url.match(path));
    }
}
exports.LipthusWebSocketServer = LipthusWebSocketServer;
