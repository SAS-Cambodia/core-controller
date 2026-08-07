import express, {
	Express,
	NextFunction,
	Request,
	Response,
	Router
} from 'express';
import bodyParser, {
	Options,
	OptionsJson,
	OptionsUrlencoded,
	OptionsText
} from 'body-parser';
import {
	DECORATOR_KEY,
	executeRoute,
	FileUpload,
	isInterceptor,
	isInterceptorError,
	isMiddleware,
	prepareController
} from "../../controller";
import {
	CorsOptions,
	CorsOptionsDelegate
} from "cors";
import AppContext from "./app-context";
import { serverOptions } from "./index";
import http,{
	IncomingMessage,
	Server as HttpServer,
	ServerResponse
} from "http";
import { Options as RateOptions } from "express-rate-limit";
import { HttpError } from "../../http-error-exception";
import { AccessControlGuard, CoreMiddleware, ErrorInterceptor, Interceptor, NotFoundHandler, PlanAccessControlGuard } from "../../interface";
import { ProviderTarget, RouteInfo } from "../../type";
import { HttpStatusCode } from "../../enums/http-code";
import { container } from "../../di";
import { ServerAdapter } from "./server-adapter";
import {
	hasRequiredMatch,
	instantiateController,
	registerProviders,
	requireAccessControlGuard,
	requirePlanGuard,
	resolveAccessControlRoles,
	resolveGuards,
	resolvePlanRequirement,
	runGuards
} from "./shared/registration-helpers";

export class CoreApplication {

	/**
	 * The underlying Express application. Constructed synchronously in the
	 * constructor, so it's available immediately after createServer() returns —
	 * use it as an escape hatch to call any native Express API directly
	 * (app.server.set(...), app.server.enable(...), app.server.disable(...),
	 * app.server.locals, mounting extra routes/middleware not covered by this
	 * library's own methods, etc.).
	 */
	public server: Express;
	private corsOptions: CorsOptions | CorsOptionsDelegate = {};
	private interceptors: Interceptor[] = [];
	private interceptorError: ErrorInterceptor[] = [];
	private notFoundHandler?: NotFoundHandler;
	private rateLimitOptions?: Partial<RateOptions>;
	private defaultErrorStatusCode?: number;
	private requestLoggingEnabled = false;
	private middlewares: CoreMiddleware[] = [];
	private accessControlGuard?: AccessControlGuard;
	private planGuard?: PlanAccessControlGuard;
	private prefix?: string;
	private excludePrefix?: string[] = [];
	private readonly adapter?: ServerAdapter;
	private readonly controllerClasses: Function[];
	private readonly httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse>;
	private readonly appContext: AppContext;
	private started = false;

	constructor(private options: serverOptions) {
		const {
			providers,
			controllers,
			adapter
		} = this.options;
		this.controllerClasses = prepareController(controllers);
		this.server = express();
		this.appContext = new AppContext();
		this.adapter = adapter;
		// Registered immediately (not deferred to start()) so a provider declared
		// here is resolvable by any other app sharing the same adapter regardless
		// of which app's start() runs first — the DI container is a process-wide
		// singleton, so this is effectively whole-app provider sharing.
		registerProviders(providers);
		if (adapter) {
			adapter.attachRequestHandler(this.server);
			this.httpServer = adapter.getHttpServer();
			adapter.attach(this);
		} else {
			this.httpServer = http.createServer(this.server);
		}
	}

	/**
	 * Registers global middleware functions to be used by the application.
	 * Each middleware is instantiated and added to the middleware stack if it meets the criteria.
	 *
	 * @param middlewares - A list of middleware classes to be instantiated and used globally.
	 * Each middleware should be a class that can be instantiated.
	 */
	public useGlobalMiddleware(...middlewares: any[]) {
		middlewares.forEach((instance) => {
			const middleware = new instance();
			if (isMiddleware(middleware)) {
				this.middlewares.push(middleware);
			}
		});
	}

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
	public useAccessControl(guard: new (...args: any[]) => AccessControlGuard) {
		this.accessControlGuard = new guard();
	}

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
	public usePlanAccessControl(guard: new (...args: any[]) => PlanAccessControlGuard) {
		this.planGuard = new guard();
	}

	/**
	 * Retrieves an instance of the given provider target from the container.
	 *
	 * @param {ProviderTarget<T>} target - The provider target or token used to resolve the instance.
	 * @return {T} The resolved instance associated with the given provider target.
	 */
	public get<T>(target: ProviderTarget<T>): T{
		return container.resolve<T>(target);
	}

	/**
	 * Enables Cross-Origin Resource Sharing (CORS) for the server using the specified options.
	 *
	 * @param {CorsOptions | CorsOptionsDelegate} options - The configuration object or function used to set up CORS options.
	 * @return {void} This method does not return a value.
	 */
	public enableCors(options: CorsOptions | CorsOptionsDelegate): void {
		this.corsOptions = options;
	}

	/**
	 * Enables logging of incoming requests — one line per request, printed when
	 * the response finishes, showing method, path, status code, and duration.
	 * Intended for development use.
	 */
	public enableRequestLogging(): void {
		this.requestLoggingEnabled = true;
	}

	/**
	 * Sets a global prefix for all routes in the application.
	 * This prefix will be prepended to all controller paths unless specified in the exclude list.
	 *
	 * @param prefix - The global prefix to be applied to all routes.
	 * @param excludePrefix - An optional array of route paths that should not have the global prefix applied.
	 */
	public setGlobalPrefix(prefix: string, excludePrefix?: string[]) {
		this.prefix = prefix;
		this.excludePrefix = excludePrefix;
	}

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
	public useGlobalInterceptors(...interceptors: any[]) {
		interceptors.forEach((instance) => {
			const interceptorInstance = new instance();
			if (isInterceptor(interceptorInstance)) {
				const isResponseInterceptor = Reflect.getMetadata(DECORATOR_KEY.RESPONSE_INTERCEPTOR, instance);
				if (!isResponseInterceptor) {
					throw new Error(`[Interceptor] ${instance.name} implements intercept() but has no @ResponseInterceptor() applied — it will never run.`);
				}
				this.interceptors.push(interceptorInstance);
			}
			if (isInterceptorError(interceptorInstance)) this.interceptorError.push(interceptorInstance);
		});
	}

	/**
	 * Registers the fallback handler invoked when no route matches. Unlike
	 * useGlobalInterceptors this isn't a spreadable list — the mounted middleware
	 * is terminal (doesn't call next()), so only one handler can ever meaningfully
	 * fire; the API reflects that by taking a single class.
	 *
	 * @param handler - A class implementing NotFoundHandler.
	 */
	public useNotFoundHandler(handler: new (...args: any[]) => NotFoundHandler): void {
		this.notFoundHandler = new handler();
	}

	private buildHttpAccessControlMiddleware(accessControlRoles: string[], label: string) {
		const guard = requireAccessControlGuard(this.accessControlGuard, label);
		return async (request: Request, response: Response, next: NextFunction) => {
			try {
				const resolvedRoles = await guard.resolveRoles({ request, response });
				if (!hasRequiredMatch(accessControlRoles, resolvedRoles)) {
					return next(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN));
				}
				next();
			} catch (e) {
				next(e);
			}
		};
	}

	private buildHttpPlanMiddleware(requiredPlans: string[], label: string) {
		const guard = requirePlanGuard(this.planGuard, label);
		return async (request: Request, response: Response, next: NextFunction) => {
			try {
				const resolvedPlans = await guard.resolvePlans({ request, response });
				if (!hasRequiredMatch(requiredPlans, resolvedPlans)) {
					return next(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN));
				}
				next();
			} catch (e) {
				next(e);
			}
		};
	}

	private buildFileUploadMiddleware(fileUpload: { options: FileUpload }) {
		const multer = require("multer");
		if (!multer) throw new Error("Invalid multer install");

		const {
			keyField,
			storage,
			type,
			limits,
			dest,
			preservePath,
			fileFilter,
			maxCount
		} = fileUpload.options;

		const upload = multer({
			dest,
			storage,
			limits,
			preservePath,
			fileFilter
		});

		switch (type) {
			case "single":
				return typeof keyField === "string" ? upload.single(keyField) : undefined;
			case "array":
				return typeof keyField === "string" ? upload.array(keyField, maxCount) : undefined;
			case "fields":
				return Array.isArray(keyField) ? upload.fields(keyField) : undefined;
			case "any":
				return upload.any();
			case "none":
				return upload.none();
		}
	}

	private registerHttpRoute(
		router: Router,
		ControllerClass: any,
		controllerInstance: any,
		prototype: any,
		methodName: string,
		classMethod: string,
		route_path: string,
		routePath: string,
		logger: RouteInfo[]
	) {
		const fileUpload = Reflect.getMetadata(DECORATOR_KEY.FILE_UPLOAD, controllerInstance, methodName);
		const args: any[] = [route_path];

		if (fileUpload) {
			const uploadMiddleware = this.buildFileUploadMiddleware(fileUpload);
			if (uploadMiddleware) args.push(uploadMiddleware);
		}

		const methodRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, prototype, methodName);
		const classRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, ControllerClass);
		const accessControlRoles = resolveAccessControlRoles(methodRoles, classRoles);

		if (accessControlRoles !== undefined) {
			args.push(this.buildHttpAccessControlMiddleware(accessControlRoles, `${ControllerClass.name}.${methodName}`));
		}

		const methodPlans = Reflect.getMetadata(DECORATOR_KEY.REQUIRE_PLAN, prototype, methodName);
		const classPlans = Reflect.getMetadata(DECORATOR_KEY.REQUIRE_PLAN, ControllerClass);
		const requiredPlans = resolvePlanRequirement(methodPlans, classPlans);

		if (requiredPlans !== undefined) {
			args.push(this.buildHttpPlanMiddleware(requiredPlans, `${ControllerClass.name}.${methodName}`));
		}

		const guards = resolveGuards(prototype, ControllerClass, methodName);
		if (guards.length > 0) {
			args.push(async (request: Request, response: Response, next: NextFunction) => {
				try {
					const allowed = await runGuards(guards, { request, response });
					if (!allowed) {
						return next(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN));
					}
					next();
				} catch (e) {
					next(e);
				}
			});
		}

		args.push(executeRoute.bind({
			controllerInstance,
			methodName,
			appContext: this.appContext
		}));
		// @ts-ignore
		router[classMethod](...args);

		logger.push({
			BasePath: `${routePath}${route_path}`,
			Event: classMethod.toUpperCase(),
			ControllerName: ControllerClass.name,
			ImplementMethod: methodName,
			Type: "API"
		});
	}

	private async registerController(controllers: any[]): Promise<RouteInfo[]> {
		const logger: RouteInfo[] = [];

		for (const ControllerClass of controllers) {
			const router = Router();
			// Inject providers into the controller constructor
			const controllerInstance = instantiateController(ControllerClass);
			const prototype = Object.getPrototypeOf(controllerInstance);
			const methods = Object.getOwnPropertyNames(prototype);
			const basePath = Reflect.getMetadata(DECORATOR_KEY.CONTROLLER_PATH, ControllerClass);
			const controllerKey = Reflect.getMetadata(DECORATOR_KEY.CONTROLLER, ControllerClass);

			if (controllerKey !== DECORATOR_KEY.CONTROLLER) continue;

			if (!basePath) {
				console.warn(`\x1b[43m [Warning] Controller ${ControllerClass.name} is missing a base path. \x1b[0m`);
				continue;
			}

			// Start config Route Api
			const routePath = this.excludePrefix?.includes(basePath) ? basePath : this.prefix ? this.prefix + basePath : basePath;

			for (const methodName of methods) {
				if (methodName === "constructor") continue;
				const route_path = Reflect.getMetadata(DECORATOR_KEY.ROUTE_PATH, prototype, methodName) || "";
				const classMethod = Reflect.getMetadata(DECORATOR_KEY.METHOD, prototype, methodName);

				if (typeof controllerInstance[methodName] !== "function" || !classMethod) continue;
				if (classMethod === "event") continue; // @SocketController classes are already filtered out above

				this.registerHttpRoute(router, ControllerClass, controllerInstance, prototype, methodName, classMethod, route_path, routePath, logger);
			}

			this.server.use(routePath, router);
		}

		if (this.options.enableLogging) console.table(logger);

		return logger;
	}

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
	public setBodyParserOptions(options: {
		urlencoded?: OptionsUrlencoded,
		json?: OptionsJson,
		raw?: Options,
		text?: OptionsText
	}) {
		this.server.use(express.json());
		let config;
		// @ts-ignore
		for (let key in options) config = bodyParser[key](options[key]);
		if(config) this.server.use(config);
	}

	/**
	 * Sets the rate limit configuration for the instance.
	 *
	 * @param {Partial<RateOptions>} options - An object containing partial properties of the rate options configuration.
	 * @return {void} This method does not return a value.
	 */
	public setRateLimit(options: Partial<RateOptions>): void {
		this.rateLimitOptions = options;
	}

	/**
	 * Sets the HTTP status code used when a caught error shouldn't dictate the
	 * wire status itself — either because it has no `statusCode` at all, or it
	 * was thrown as `new HttpError(message, code, details, { bodyOnly: true })`,
	 * meaning `code` is a business/error code meant for the response body, not
	 * the actual HTTP status. Defaults to 500 until configured.
	 *
	 * @param statusCode - The default HTTP status code for such error responses.
	 */
	public setDefaultErrorStatusCode(statusCode: number): void {
		this.defaultErrorStatusCode = statusCode;
	}

	private applyRequestLogging(): void {
		if (!this.requestLoggingEnabled) return;
		this.server.use((request: Request, response: Response, next: NextFunction) => {
			const startTime = Date.now();
			response.on('finish', () => {
				const duration = Date.now() - startTime;
				console.log(`[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms Body: ${JSON.stringify(request.body)}`);
			});
			next();
		});
	}

	private applyCors(): void {
		const cors = require("cors");
		this.server.use(cors(this.corsOptions));
	}

	private applyRateLimit(): void {
		if (!this.rateLimitOptions) return;
		const rateLimit = require("express-rate-limit");
		this.server.use(rateLimit(this.rateLimitOptions));
	}

	private executeMiddleware(){
		this.middlewares.forEach(middleware => {
			this.server.use(middleware.use.bind(middleware));
		});
	}

	/**
	 * Hands the full registered HTTP route list to any middleware implementing
	 * the optional `setRoutes()` method, once controller registration has
	 * finished and before the server starts listening.
	 */
	private notifyMiddlewareRoutes(routes: RouteInfo[]): void {
		this.middlewares.forEach((middleware) => {
			if (typeof middleware.setRoutes === "function") {
				middleware.setRoutes(routes);
			}
		});
	}

	private registerResponseInterceptors() {
		if(this.interceptors.length > 0) {
			this.interceptors.forEach((interceptor)=> {
				this.server.use((
					request,
					response,
					next
				) => {
					this.appContext.onEmitInterceptor({
						method: request.method,
						url: request.url,
						startTime: new Date(),
						interceptor,
						response,
						request
					})
					next();
				});
			});
		}
	}

	private applyNotFoundHandler() {
		if (!this.notFoundHandler) return;
		this.server.use((request, response) => {
			const data = this.notFoundHandler!.handle({ response, request });
			if (data !== undefined) {
				response.status(HttpStatusCode.NOT_FOUND).json(data);
			}
		});
	}

	private catch(){
		this.interceptorError.forEach((instance) => {
			this.server.use((
				error: any,
				request: Request,
				response: Response,
				next: NextFunction
			) => {

				const data = instance.catch({
					error,
					request,
					response,
					next
				});

				if(data !== undefined) {
					const useErrorStatusCode = error?.statusCode !== undefined && !error?.bodyOnly;
					const statusCode = this.defaultErrorStatusCode ? this.defaultErrorStatusCode : useErrorStatusCode ? error.statusCode : response.statusCode;
					response.status(statusCode).json(data);
				}
			});
		})
	}

	public async start(): Promise<void>;
	public async start(port: number | string, callback?: () => void): Promise<void>;
	public async start(port?: number | string, callback?: () => void): Promise<void> {
		if (this.adapter) {
			if (port !== undefined) {
				throw new Error("[CoreApplication] start(port) was called but this app is attached to a shared ServerAdapter (createServer({ adapter })). The adapter owns port binding and automatically starts every attached app when you call adapter.listen(port, callback) — you no longer need to call app.start() yourself, though doing so with no arguments is still harmless.");
			}
		} else if (port === undefined) {
			throw new Error("[CoreApplication] start(port) requires a port when no adapter is attached. Pass a port, or attach a ServerAdapter via createServer({ adapter }) and call adapter.listen(port, callback) instead.");
		}

		if (this.started) return;
		this.started = true;

		this.appContext.start();
		this.applyRequestLogging();
		this.applyCors();
		this.applyRateLimit();
		this.executeMiddleware();
		this.registerResponseInterceptors();
		const routes = await this.registerController(this.controllerClasses);
		this.notifyMiddlewareRoutes(routes);
		this.applyNotFoundHandler();
		this.catch();

		if (!this.adapter) {
			this.httpServer.listen(port!, callback);
		}
	}
}