import { IncomingMessage, RequestListener, Server as HttpServer, ServerResponse } from "http";
/**
 * Structural contract for anything ServerAdapter can auto-start on listen().
 * CoreApplication/SocketApplication's overloaded `start` (`(): Promise<void>`
 * and `(port, callback?): Promise<void>`) both satisfy this — TS function-type
 * assignability only requires that at least one of the source's overload
 * signatures matches the target signature, and the zero-arg overload matches
 * exactly.
 */
export interface StartableApp {
    start(): Promise<void>;
}
/**
 * Owns a bare http.Server with no Express (or any other request handler)
 * attached. CoreApplication and SocketApplication can each be constructed
 * with a shared ServerAdapter to attach themselves onto the same underlying
 * http.Server/port instead of each creating their own — the composition
 * point for running HTTP + Socket.IO together while keeping both classes
 * independently usable on their own.
 */
export declare class ServerAdapter {
    private readonly httpServer;
    private requestHandlerAttached;
    private readonly attachedApps;
    constructor();
    /**
     * The shared http.Server both CoreApplication and SocketApplication
     * attach to when constructed with this adapter.
     */
    getHttpServer(): HttpServer<typeof IncomingMessage, typeof ServerResponse>;
    /**
     * Wires a request handler (an Express app, or any RequestListener) onto
     * this adapter's http.Server. `httpServer.on('request', handler)` after
     * construction has the same effect as passing `handler` to
     * `http.createServer(handler)` — this is how CoreApplication attaches to
     * an http.Server it did not create itself.
     *
     * Only one request handler may be attached to a given adapter — sharing
     * an adapter between two HTTP apps would silently double-handle requests.
     */
    attachRequestHandler(handler: RequestListener<typeof IncomingMessage, typeof ServerResponse>): void;
    /**
     * Registers an app (CoreApplication/SocketApplication) constructed with
     * this adapter so that listen() can call its no-arg start() automatically.
     * Called internally by both classes' constructors — not part of the
     * public bootstrap API a user is expected to call directly.
     */
    attach(app: StartableApp): void;
    /**
     * Starts every app attached to this adapter (controller/namespace
     * registration, middleware wiring, etc.) without binding the port.
     * Split out from listen() for setups where something other than this
     * adapter owns port binding — e.g. a Socket.IO cluster worker under
     * @socket.io/sticky, where the primary process binds the real port and
     * hands off connections to workers over IPC, so a worker must finish
     * app.start() (to populate SocketApplication.socketServer) but must NOT
     * call httpServer.listen() itself.
     */
    startApps(): Promise<void>;
    /**
     * Starts every app attached to this adapter (registration only — see
     * StartableApp), then binds the port. This is the single source of truth
     * for actually listening when an adapter is shared between apps; callers
     * no longer need to call `.start()` on each attached app themselves.
     */
    listen(port: number | string, callback?: () => void): Promise<HttpServer<typeof IncomingMessage, typeof ServerResponse>>;
}
