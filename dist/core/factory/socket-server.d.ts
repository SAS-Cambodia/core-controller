import { Server as ServerSK } from "socket.io";
import { CorsOptions, CorsOptionsDelegate } from "cors";
import { AccessControlGuard, PlanAccessControlGuard } from "../../interface";
import { ProviderTarget } from "../../type";
import { socketServerAppOptions } from "./index";
export declare class SocketApplication {
    private options;
    /**
     * The underlying Socket.IO Server instance — an escape hatch to call any
     * native Socket.IO API directly (socketApp.socketServer.engine.on(...),
     * .of(...), custom adapters, etc.).
     *
     * Unlike CoreApplication.server, this is NOT available immediately after
     * createSocketServer() returns — Socket.IO bakes options like `cors` into
     * the server at construction time, so construction is deferred until
     * start() runs (directly, or automatically via adapter.listen()). Access
     * it only after that point (e.g. inside the adapter.listen() callback).
     */
    socketServer: ServerSK;
    private accessControlGuard?;
    private planGuard?;
    private corsOptions?;
    private readonly middlewares;
    private readonly adapter?;
    private readonly httpServer;
    private readonly controllerClasses;
    private started;
    constructor(options: socketServerAppOptions);
    /**
     * Registers the role-resolution guard used to enforce @AccessControl() on
     * socket events. Independent of the guard registered on a CoreApplication
     * sharing the same adapter — guard state isn't shared between apps, so a
     * guarded @SocketController event needs its guard registered here too.
     *
     * Must be called before start(), since @AccessControl-guarded events are
     * validated against this guard during namespace registration.
     */
    useAccessControl(guard: new (...args: any[]) => AccessControlGuard): void;
    /**
     * Registers the plan-resolution guard used to enforce @RequirePlan() on
     * socket events. Must be called before start().
     */
    usePlanAccessControl(guard: new (...args: any[]) => PlanAccessControlGuard): void;
    /**
     * Registers global socket middleware to be used across all socket namespaces.
     * Each middleware is instantiated and added to the middleware stack if it meets the criteria.
     *
     * Must be called before start(), since middleware is applied to each namespace
     * as it's registered during registerSocketNamespace().
     *
     * @param middlewares - A list of socket middleware classes to be instantiated and used globally.
     */
    useGlobalMiddleware(...middlewares: any[]): void;
    /**
     * Enables Cross-Origin Resource Sharing (CORS) for the socket server.
     * Must be called before start() — Socket.IO bakes its CORS handling into
     * the server at construction time, so this only takes effect because the
     * underlying Socket.IO Server is itself constructed inside start(), not here.
     */
    enableCors(options: CorsOptions | CorsOptionsDelegate): void;
    /**
     * Retrieves an instance of the given provider target from the container.
     */
    get<T>(target: ProviderTarget<T>): T;
    /**
     * Marshals args (@SocketInstance/@SocketCallback/@SocketData/@SocketBody), enforces
     * @AccessControl, validates @SocketBody, and binds a single socket event listener.
     */
    private bindSocketEvent;
    /**
     * Resolves (or creates) the socket namespace for basePath, registers @AccessControl
     * pre-checks, and binds connection/event listeners for its subscribers.
     */
    private registerSocketNamespace;
    private registerController;
    /**
     * Hands the full registered socket route list to any middleware implementing
     * the optional `setRoutes()` method, once controller/namespace registration
     * has finished and before the server starts listening.
     */
    private notifyMiddlewareRoutes;
    start(): Promise<void>;
    start(port: number | string, callback?: () => void): Promise<void>;
}
