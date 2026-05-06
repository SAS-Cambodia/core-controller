import { CoreApplication } from "./static-server";
import { Server, Socket, ExtendedError } from "socket.io";
import type { IncomingMessage } from "http";
import type { CorsOptions, CorsOptionsDelegate } from "cors";
import { CookieSerializeOptions } from "engine.io/build/contrib/types.cookie";
import { Request, Response } from "express";
import { Interceptor } from "../../interface";
type Transport = "polling" | "websocket" | "webtransport";
export interface SocketServerOptions {
    /**
     * how many ms without a pong packet to consider the connection closed
     * @default 20000
     */
    pingTimeout?: number;
    /**
     * how many ms before sending a new ping packet
     * @default 25000
     */
    pingInterval?: number;
    /**
     * how many ms before an uncompleted transport upgrade is cancelled
     * @default 10000
     */
    upgradeTimeout?: number;
    /**
     * how many bytes or characters a message can be, before closing the session (to avoid DoS).
     * @default 1e5 (100 KB)
     */
    maxHttpBufferSize?: number;
    /**
     * A function that receives a given handshake or upgrade request as its first parameter,
     * and can decide whether to continue or not. The second argument is a function that needs
     * to be called with the decided information: fn(err, success), where success is a boolean
     * value where false means that the request is rejected, and err is an error code.
     */
    allowRequest?: (req: IncomingMessage, fn: (err: string | null | undefined, success: boolean) => void) => void;
    /**
     * The low-level transports that are enabled. WebTransport is disabled by default and must be manually enabled:
     *
     * @example
     * new Server({
     *   transports: ["polling", "websocket", "webtransport"]
     * });
     *
     * @default ["polling", "websocket"]
     */
    transports?: Transport[];
    /**
     * whether to allow transport upgrades
     * @default true
     */
    allowUpgrades?: boolean;
    /**
     * parameters of the WebSocket permessage-deflate extension (see ws module api docs). Set to false to disable.
     * @default false
     */
    perMessageDeflate?: boolean | object;
    /**
     * parameters of the http compression for the polling transports (see zlib api docs). Set to false to disable.
     * @default true
     */
    httpCompression?: boolean | object;
    /**
     * what WebSocket server implementation to use. Specified module must
     * conform to the ws interface (see ws module api docs).
     * An alternative c++ addon is also available by installing eiows module.
     *
     * @default `require("ws").Server`
     */
    wsEngine?: any;
    /**
     * an optional packet which will be concatenated to the handshake packet emitted by Engine.IO.
     */
    initialPacket?: any;
    /**
     * configuration of the cookie that contains the client sid to send as part of handshake response headers. This cookie
     * might be used for sticky-session. Defaults to not sending any cookie.
     * @default false
     */
    cookie?: (CookieSerializeOptions & {
        name: string;
    }) | boolean;
    /**
     * the options that will be forwarded to the cors module
     */
    cors?: CorsOptions | CorsOptionsDelegate;
    /**
     * whether to enable compatibility with Socket.IO v2 clients
     * @default false
     */
    allowEIO3?: boolean;
}
export type serverOptions = {
    controllers: Function[] | string[];
    providers?: Function[];
    enableLogging?: boolean;
    SocketIO?: typeof Server;
    socketOptions?: SocketServerOptions;
    socketMiddleware?: (socket: Socket, next: (err?: ExtendedError) => void) => void;
};
export declare class ServerFactory {
    static createServer(options: serverOptions): CoreApplication;
}
export interface EmitInterceptor {
    method: string;
    url: string;
    startTime: Date;
    interceptor: Interceptor;
    request: Request;
    response: Response;
}
export interface SendJsonResponse {
    data: any;
    request: Request;
    response: Response;
    startTime: Date;
}
export {};
