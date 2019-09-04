import { Server as WebSocketServer, ServerOptions } from "ws";
import * as WebSocket from "ws";
export declare class LipthusWebSocketServer extends WebSocketServer {
    constructor(options?: ServerOptions, callback?: () => void);
    broadcast(data: any, path: string): void;
    getClients(path: string): Array<WebSocket>;
}
