"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerAdapter = void 0;
const http_1 = __importDefault(require("http"));
/**
 * Owns a bare http.Server with no Express (or any other request handler)
 * attached. CoreApplication and SocketApplication can each be constructed
 * with a shared ServerAdapter to attach themselves onto the same underlying
 * http.Server/port instead of each creating their own — the composition
 * point for running HTTP + Socket.IO together while keeping both classes
 * independently usable on their own.
 */
class ServerAdapter {
    constructor() {
        this.requestHandlerAttached = false;
        this.attachedApps = [];
        this.httpServer = http_1.default.createServer();
    }
    /**
     * The shared http.Server both CoreApplication and SocketApplication
     * attach to when constructed with this adapter.
     */
    getHttpServer() {
        return this.httpServer;
    }
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
    attachRequestHandler(handler) {
        if (this.requestHandlerAttached) {
            throw new Error("[ServerAdapter] A request handler is already attached to this adapter. Only one HTTP app (createServer({ adapter })) may share a given ServerAdapter.");
        }
        this.requestHandlerAttached = true;
        this.httpServer.on("request", handler);
    }
    /**
     * Registers an app (CoreApplication/SocketApplication) constructed with
     * this adapter so that listen() can call its no-arg start() automatically.
     * Called internally by both classes' constructors — not part of the
     * public bootstrap API a user is expected to call directly.
     */
    attach(app) {
        this.attachedApps.push(app);
    }
    /**
     * Starts every app attached to this adapter (registration only — see
     * StartableApp), then binds the port. This is the single source of truth
     * for actually listening when an adapter is shared between apps; callers
     * no longer need to call `.start()` on each attached app themselves.
     */
    listen(port, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(this.attachedApps.map((app) => app.start()));
            return this.httpServer.listen(port, callback);
        });
    }
}
exports.ServerAdapter = ServerAdapter;
