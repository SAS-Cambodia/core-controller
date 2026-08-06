import { Express } from 'express';
import { Options, OptionsJson, OptionsUrlencoded, OptionsText } from 'body-parser';
import { CorsOptions, CorsOptionsDelegate } from "cors";
import { serverOptions } from "./index";
import { Options as RateOptions } from "express-rate-limit";
import { AccessControlGuard, NotFoundHandler, PlanAccessControlGuard } from "../../interface";
import { ProviderTarget } from "../../type";
export declare class CoreApplication {
    private options;
    /**
     * The underlying Express application. Constructed synchronously in the
     * constructor, so it's available immediately after createServer() returns —
     * use it as an escape hatch to call any native Express API directly
     * (app.server.set(...), app.server.enable(...), app.server.disable(...),
     * app.server.locals, mounting extra routes/middleware not covered by this
     * library's own methods, etc.).
     */
    server: Express;
    private corsOptions;
    private interceptors;
    private interceptorError;
    private notFoundHandler?;
    private rateLimitOptions?;
    private defaultErrorStatusCode?;
    private requestLoggingEnabled;
    private middlewares;
    private accessControlGuard?;
    private planGuard?;
    private prefix?;
    private excludePrefix?;
    private readonly adapter?;
    private readonly controllerClasses;
    private readonly httpServer;
    private readonly appContext;
    private started;
    constructor(options: serverOptions);
    /**
     * Registers global middleware functions to be used by the application.
     * Each middleware is instantiated and added to the middleware stack if it meets the criteria.
     *
     * @param middlewares - A list of middleware classes to be instantiated and used globally.
     * Each middleware should be a class that can be instantiated.
     */
    useGlobalMiddleware(...middlewares: any[]): void;
    /**
     * Registers the role-resolution guard used to enforce @AccessControl().
     * The guard is instantiated directly (not resolved via the DI container),
     * matching useGlobalMiddleware/useGlobalInterceptors — @Inject() still works
     * on guard properties regardless, since it resolves lazily via a getter.
     *
     * Must be called before start(), since @AccessControl-guarded routes/events
     * are validated against this guard during controller registration.
     *
     * @param guard - A class implementing AccessControlGuard.
     */
    useAccessControl(guard: new (...args: any[]) => AccessControlGuard): void;
    /**
     * Registers the plan-resolution guard used to enforce @RequirePlan(), for
     * gating features behind a caller's subscription tier. Independent of
     * @AccessControl/useAccessControl — a route can require a role and a plan
     * at the same time, since "who you are" and "what you're subscribed to"
     * are separate axes.
     *
     * Must be called before start(), since @RequirePlan-guarded routes/events
     * are validated against this guard during controller registration.
     *
     * @param guard - A class implementing PlanAccessControlGuard.
     */
    usePlanAccessControl(guard: new (...args: any[]) => PlanAccessControlGuard): void;
    /**
     * Retrieves an instance of the given provider target from the container.
     *
     * @param {ProviderTarget<T>} target - The provider target or token used to resolve the instance.
     * @return {T} The resolved instance associated with the given provider target.
     */
    get<T>(target: ProviderTarget<T>): T;
    /**
     * Enables Cross-Origin Resource Sharing (CORS) for the server using the specified options.
     *
     * @param {CorsOptions | CorsOptionsDelegate} options - The configuration object or function used to set up CORS options.
     * @return {void} This method does not return a value.
     */
    enableCors(options: CorsOptions | CorsOptionsDelegate): void;
    /**
     * Enables logging of incoming requests — one line per request, printed when
     * the response finishes, showing method, path, status code, and duration.
     * Intended for development use.
     */
    enableRequestLogging(): void;
    /**
     * Sets a global prefix for all routes in the application.
     * This prefix will be prepended to all controller paths unless specified in the exclude list.
     *
     * @param prefix - The global prefix to be applied to all routes.
     * @param excludePrefix - An optional array of route paths that should not have the global prefix applied.
     */
    setGlobalPrefix(prefix: string, excludePrefix?: string[]): void;
    /**
     * Registers global interceptors for the application: response interceptors
     * (classes implementing `Interceptor`, tagged with `@ResponseInterceptor()`,
     * chained in registration order to shape a matched route's response body)
     * and error interceptors (classes implementing `ErrorInterceptor`, detected
     * structurally via their `catch()` method — no decorator needed).
     *
     * @param interceptors - An array of interceptor classes to be instantiated and used globally.
     *                       Each interceptor should be a class that can be instantiated.
     *
     * @throws if a class implements `intercept()` but has no `@ResponseInterceptor()`
     * applied — it would otherwise silently never run.
     *
     * @example
     * ```
     * app.useGlobalInterceptors(LoggingInterceptor, ErrorHandlingInterceptor);
     * ```
     */
    useGlobalInterceptors(...interceptors: any[]): void;
    /**
     * Registers the fallback handler invoked when no route matches. Unlike
     * useGlobalInterceptors this isn't a spreadable list — the mounted middleware
     * is terminal (doesn't call next()), so only one handler can ever meaningfully
     * fire; the API reflects that by taking a single class.
     *
     * @param handler - A class implementing NotFoundHandler.
     */
    useNotFoundHandler(handler: new (...args: any[]) => NotFoundHandler): void;
    private buildHttpAccessControlMiddleware;
    private buildHttpPlanMiddleware;
    private buildFileUploadMiddleware;
    private registerHttpRoute;
    private registerController;
    /**
     * Configures body parsing options for the Express server.
     * This method sets up middleware to parse incoming request bodies based on the provided options.
     *
     * @param options - An object containing configuration options for different body parser types.
     * @param options.urlencoded - Options for parsing URL-encoded bodies. See OptionsUrlencoded for details.
     * @param options.json - Options for parsing JSON bodies. See OptionsJson for details.
     * @param options.raw - Options for parsing raw bodies. See Options for details.
     * @param options.text - Options for parsing plain text bodies. See OptionsText for details.
     *
     * @returns void
     *
     * @remarks
     * This method first applies the express.json() middleware, then iterates through the provided options
     * to apply additional body-parser middleware as specified.
     */
    setBodyParserOptions(options: {
        urlencoded?: OptionsUrlencoded;
        json?: OptionsJson;
        raw?: Options;
        text?: OptionsText;
    }): void;
    /**
     * Sets the rate limit configuration for the instance.
     *
     * @param {Partial<RateOptions>} options - An object containing partial properties of the rate options configuration.
     * @return {void} This method does not return a value.
     */
    setRateLimit(options: Partial<RateOptions>): void;
    /**
     * Sets the HTTP status code used when a caught error shouldn't dictate the
     * wire status itself — either because it has no `statusCode` at all, or it
     * was thrown as `new HttpError(message, code, details, { bodyOnly: true })`,
     * meaning `code` is a business/error code meant for the response body, not
     * the actual HTTP status. Defaults to 500 until configured.
     *
     * @param statusCode - The default HTTP status code for such error responses.
     */
    setDefaultErrorStatusCode(statusCode: number): void;
    private applyRequestLogging;
    private applyCors;
    private applyRateLimit;
    private executeMiddleware;
    /**
     * Hands the full registered HTTP route list to any middleware implementing
     * the optional `setRoutes()` method, once controller registration has
     * finished and before the server starts listening.
     */
    private notifyMiddlewareRoutes;
    private registerResponseInterceptors;
    private applyNotFoundHandler;
    private catch;
    start(): Promise<void>;
    start(port: number | string, callback?: () => void): Promise<void>;
}
