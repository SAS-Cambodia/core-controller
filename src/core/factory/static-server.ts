import express, {
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
import { Server as ServerSK, Socket } from "socket.io"
import { plainToInstance } from "class-transformer";
import { Options as RateOptions } from "express-rate-limit";
import { validate } from "class-validator";
import { HttpError } from "../../http-error-exception";
import { AccessControlContext, AccessControlGuard, CanActivate, CoreMiddleware, ErrorInterceptor, Interceptor } from "../../interface";
import {ProviderTarget, SocketCallBack} from "../../type";
import { HttpStatusCode } from "../../enums/http-code";
import { container } from "../../di";

type LogType = {
	BasePath?: string,
	Event?: string,
	ControllerName?: string,
	ImplementMethod?: string,
	Type?: "API" | "SOCKET"
}

export class CoreApplication {
	
	public server;
	private corsOptions: CorsOptions | CorsOptionsDelegate = {};
	private interceptorsBefore: Interceptor[] = [];
	private interceptorsAfter: Interceptor[] = [];
	private interceptorError: ErrorInterceptor[] = [];
	private socketServer: ServerSK;
	private rateLimitOptions?: Partial<RateOptions>;
	private middlewares: CoreMiddleware[] = [];
	private accessControlGuard?: AccessControlGuard;
	private prefix?: string;
	private excludePrefix?: string[] = [];
	private readonly controllerClasses: Function[];
	private readonly httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse>;
	private readonly providers?: Function[];
	private readonly appContext: AppContext;
	
	constructor(private options: serverOptions) {
		const {
			SocketIO,
			socketOptions,
			providers,
			controllers
		} = this.options;
		this.controllerClasses = prepareController(controllers);
		this.server = express();
		this.providers = providers;
		this.appContext = new AppContext();
		this.httpServer = http.createServer(this.server);
		if (SocketIO) {
			this.socketServer = new SocketIO(this.httpServer, socketOptions);
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
	 * Registers global interceptors for the application.
	 * This method allows adding interceptors that will be applied globally to all routes.
	 * It supports both regular interceptors (before and after) and error interceptors.
	 *
	 * @param interceptors - An array of interceptor classes to be instantiated and used globally.
	 *                       Each interceptor should be a class that can be instantiated.
	 *
	 * @remarks
	 * The method uses reflection to determine if an interceptor should be executed before or after
	 * the main request handling, or if it's an error interceptor. It then adds the interceptor
	 * to the appropriate internal array (interceptorsBefore, interceptorsAfter, or interceptorError).
	 *
	 * @example
	 * ```
	 * app.useGlobalInterceptors(LoggingInterceptor, ErrorHandlingInterceptor);
	 * ```
	 */
	public useGlobalInterceptors(...interceptors: any[]) {
		interceptors.forEach((instance) => {
			const after = Reflect.getMetadata(DECORATOR_KEY.AFTER_INTERCEPTOR, instance);
			const before = Reflect.getMetadata(DECORATOR_KEY.BEFORE_INTERCEPTOR, instance);
			const interceptClass = new instance();
			if (isInterceptor(interceptClass)) {
				if (after) this.interceptorsAfter.push(interceptClass);
				if (before) this.interceptorsBefore.push(interceptClass);
			}
			if (isInterceptorError(interceptClass)) this.interceptorError.push(interceptClass);
		});
		
	}
	
	/**
	 * Resolves the effective @AccessControl role list for a method, falling back
	 * to the class-level roles when the method itself isn't annotated.
	 */
	private resolveAccessControlRoles(methodRoles?: string[], classRoles?: string[]): string[] | undefined {
		return methodRoles !== undefined ? methodRoles : classRoles;
	}

	private isRoleAllowed(accessControlRoles: string[], resolvedRoles: string[]): boolean {
		return accessControlRoles.length === 0
			? resolvedRoles.length > 0
			: resolvedRoles.some((role) => accessControlRoles.includes(role));
	}

	/**
	 * Returns the registered AccessControlGuard or throws, since guarded routes/events
	 * are only valid once useAccessControl() has been called.
	 */
	private requireAccessControlGuard(label: string): AccessControlGuard {
		if (!this.accessControlGuard) {
			throw new Error(`[AccessControl] ${label} requires @AccessControl but no guard was registered. Call app.useAccessControl(YourGuard) before app.start().`);
		}
		return this.accessControlGuard;
	}

	private buildHttpAccessControlMiddleware(accessControlRoles: string[], label: string) {
		const guard = this.requireAccessControlGuard(label);
		return async (request: Request, response: Response, next: NextFunction) => {
			try {
				const resolvedRoles = await guard.resolveRoles({ request, response });
				if (!this.isRoleAllowed(accessControlRoles, resolvedRoles)) {
					return next(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN));
				}
				next();
			} catch (e) {
				next(e);
			}
		};
	}

	/**
	 * Collects @UseGuards() guards from class + method level (both run, unlike
	 * @AccessControl's method-overrides-class semantics) and instantiates them.
	 */
	private resolveGuards(prototype: any, ctor: any, methodName: string): CanActivate[] {
		const classGuards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, ctor) || [];
		const methodGuards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, prototype, methodName) || [];
		return [...classGuards, ...methodGuards].map((GuardClass: any) => new GuardClass());
	}

	private async runGuards(guards: CanActivate[], context: AccessControlContext): Promise<boolean> {
		for (const guard of guards) {
			if (!(await guard.canActivate(context))) return false;
		}
		return true;
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
		logger: LogType[]
	) {
		const fileUpload = Reflect.getMetadata(DECORATOR_KEY.FILE_UPLOAD, controllerInstance, methodName);
		const args: any[] = [route_path];

		if (fileUpload) {
			const uploadMiddleware = this.buildFileUploadMiddleware(fileUpload);
			if (uploadMiddleware) args.push(uploadMiddleware);
		}

		const methodRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, prototype, methodName);
		const classRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, ControllerClass);
		const accessControlRoles = this.resolveAccessControlRoles(methodRoles, classRoles);

		if (accessControlRoles !== undefined) {
			args.push(this.buildHttpAccessControlMiddleware(accessControlRoles, `${ControllerClass.name}.${methodName}`));
		}

		const guards = this.resolveGuards(prototype, ControllerClass, methodName);
		if (guards.length > 0) {
			args.push(async (request: Request, response: Response, next: NextFunction) => {
				try {
					const allowed = await this.runGuards(guards, { request, response });
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

		if (this.options.enableLogging) {
			logger.push({
				BasePath: `${routePath}${route_path}`,
				Event: classMethod.toUpperCase(),
				ControllerName: ControllerClass.name,
				ImplementMethod: methodName,
				Type: "API"
			});
		}
	}

	/**
	 * Marshals args (@SocketInstance/@SocketCallback/@SocketData/@SocketBody), enforces
	 * @AccessControl, validates @SocketBody, and binds a single socket event listener.
	 */
	private bindSocketEvent(
		orderNamespace: any,
		socket: Socket,
		controllerInstance: any,
		subscribers: { instance: any, methods: string[] },
		methodName: string
	) {
		const prototype = Object.getPrototypeOf(subscribers.instance);
		const socketIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_INSTANCE, controllerInstance, methodName);
		const callBackIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_CALLBACK, controllerInstance, methodName);
		const bodyIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_BODY, controllerInstance, methodName);
		const dataIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_DATA, controllerInstance, methodName);
		const keyDataIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_DATA_KEY, controllerInstance, methodName);
		const socketQueryMeta = Reflect.getMetadata(DECORATOR_KEY.SOCKET_QUERY, controllerInstance, methodName) || [];
		const event = Reflect.getMetadata(DECORATOR_KEY.ROUTE_PATH, prototype, methodName);
		const methodRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, prototype, methodName);
		const classRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, subscribers.instance.constructor);
		const accessControlRoles = this.resolveAccessControlRoles(methodRoles, classRoles);
		const guards = this.resolveGuards(prototype, subscribers.instance.constructor, methodName);
		const args: any[] = [];

		socket.on(event, async <T>(data: T, callback: SocketCallBack) => {
			try {
				if (accessControlRoles !== undefined) {
					const resolvedRoles = await this.accessControlGuard!.resolveRoles({ socket, data });
					if (!this.isRoleAllowed(accessControlRoles, resolvedRoles)) {
						return callback ? callback(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN)) : undefined;
					}
				}
				if (guards.length > 0) {
					const allowed = await this.runGuards(guards, { socket, data });
					if (!allowed) {
						return callback ? callback(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN)) : undefined;
					}
				}
				if (socketIndex !== undefined) args[socketIndex] = orderNamespace;
				if (callBackIndex !== undefined && callback) args[callBackIndex] = callback;
				if (dataIndex !== undefined) args[dataIndex] = keyDataIndex ? socket.data[keyDataIndex] : data;
				socketQueryMeta.forEach(({queryKey, queryIndex}: { queryKey?: string, queryIndex: number }) => {
					args[queryIndex] = queryKey ? socket.handshake.query[queryKey] : socket.handshake.query;
				});
				if (bodyIndex !== undefined) {
					const ResBodyType = Reflect.getMetadata(DECORATOR_KEY.REQUEST_BODY_TYPE, controllerInstance, methodName);
					const ResBodyTypeOptions = Reflect.getMetadata(DECORATOR_KEY.REQUEST_BODY_OPTIONS, controllerInstance, methodName);
					if (ResBodyType) {
						const instance: any = plainToInstance(ResBodyType, data, ResBodyTypeOptions);
						const errors = await validate(instance);
						if (errors.length > 0) {
							const error = new HttpError('Validation Error', HttpStatusCode.FORBIDDEN, errors[0]);
							error.stack = JSON.stringify(errors[0]);
							return callback(error);
						}
						args[bodyIndex] = instance;
					} else {
						args[bodyIndex] = data;
					}
				}
				await subscribers.instance[methodName](...args);
			} catch (e) {
				if (callback) callback(e);
			}
		});
	}

	/**
	 * Resolves (or creates) the socket namespace for basePath, registers @AccessControl
	 * pre-checks, and binds connection/event listeners for its subscribers.
	 */
	private async registerSocketNamespace(
		basePath: string,
		subscribers: { instance: any, methods: string[] } | undefined,
		controllerInstance: any,
		logger: LogType[]
	) {
		const getBusinessId = async () => {
			if (typeof subscribers?.instance["setBusinessId"] === "function") {
				return await subscribers.instance.setBusinessId();
			}
			return null;
		};
		const businessId = await getBusinessId();
		const socketRoom = businessId !== null ? `${basePath}-${businessId}` : basePath;

		if (this.options.enableLogging && businessId !== null) {
			logger.forEach((value) => {
				if (value.BasePath === basePath) {
					value.BasePath = socketRoom;
				}
			});
		}

		const orderNamespace = this.socketServer.of(socketRoom);
		if (this.options.socketMiddleware) orderNamespace.use(this.options.socketMiddleware);
		if (!subscribers) return;

		const subscribersPrototype = Object.getPrototypeOf(subscribers.instance);
		subscribers.methods.forEach((methodName) => {
			const methodRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, subscribersPrototype, methodName);
			const classRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, subscribers.instance.constructor);
			const accessControlRoles = this.resolveAccessControlRoles(methodRoles, classRoles);
			if (accessControlRoles !== undefined) {
				this.requireAccessControlGuard(`Socket event "${methodName}"`);
			}
		});

		orderNamespace.on('connection', (socket: Socket) => {
			subscribers.instance['onConnect'](socket);
			socket.on('disconnect', (reason) => subscribers.instance['onDisconnect'](socket, reason));
			subscribers.methods.forEach((methodName) => {
				this.bindSocketEvent(orderNamespace, socket, controllerInstance, subscribers, methodName);
			});
		});
	}

	private async registerController(controllers: any[], providers: Function[] | undefined) {
		const socketEvent = new Map<string, { instance: any, methods: string[] }>();
		const logger: LogType[] = [];

		if (providers) {
			for (const ProviderClass of providers) {
				container.register(ProviderClass as any)
			}
		}

		for (const ControllerClass of controllers) {
			const router = Router();
			// Inject providers into the controller constructor
			const controllerInstance = this.instantiateController(ControllerClass);
			const prototype = Object.getPrototypeOf(controllerInstance);
			const methods = Object.getOwnPropertyNames(prototype);
			const basePath = Reflect.getMetadata(DECORATOR_KEY.CONTROLLER_PATH, ControllerClass);
			const controllerKey = Reflect.getMetadata(DECORATOR_KEY.CONTROLLER, ControllerClass);

			if (![DECORATOR_KEY.CONTROLLER, DECORATOR_KEY.SOCKET].includes(controllerKey)) continue;

			if (!basePath) {
				console.warn(`\x1b[43m [Warning] Controller ${ControllerClass.name} is missing a base path. \x1b[0m`);
				continue;
			}

			if (!socketEvent.has(basePath) && controllerKey === DECORATOR_KEY.SOCKET) {
				socketEvent.set(basePath, {
					instance: controllerInstance,
					methods: []
				});

				if (this.options.enableLogging) {
					logger.push({
						BasePath: basePath,
						Event: "ROOT",
						ControllerName: ControllerClass.name,
						ImplementMethod: "onConnect",
						Type: "SOCKET"
					});
				}

			}
			// Start config Route Api
			const routePath = this.excludePrefix?.includes(basePath) ? basePath : this.prefix ? this.prefix + basePath : basePath;

			for (const methodName of methods) {
				if (methodName === "constructor") continue;
				const route_path = Reflect.getMetadata(DECORATOR_KEY.ROUTE_PATH, prototype, methodName) || "";
				const classMethod = Reflect.getMetadata(DECORATOR_KEY.METHOD, prototype, methodName);

				if (typeof controllerInstance[methodName] !== "function" || !classMethod) continue;

				// classMethod "event" is method socket event
				if (classMethod !== "event") {
					this.registerHttpRoute(router, ControllerClass, controllerInstance, prototype, methodName, classMethod, route_path, routePath, logger);
				} else {
					socketEvent.get(basePath)?.methods.push(methodName);
					if (this.options.enableLogging) {
						logger.push({
							BasePath: basePath,
							Event: route_path,
							ControllerName: ControllerClass.name,
							ImplementMethod: methodName,
							Type: "SOCKET"
						})
					}
				}
			}

			this.server.use(routePath, router);
			// Start socket namespace
			if (socketEvent.size > 0) {
				await this.registerSocketNamespace(basePath, socketEvent.get(basePath), controllerInstance, logger);
			}
		}

		if (this.options.enableLogging) console.table(logger);
	}

	// Helper method to instantiate controllers with injected providers
	private instantiateController(ControllerClass: any) {
		const paramTypes: any[] = Reflect.getMetadata("design:paramtypes", ControllerClass) || [];
		const dependencies = paramTypes.map(type => container.resolve(type) || null);
		return new ControllerClass(...dependencies);
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
	
	private executeInterceptorBefore() {
		if(this.interceptorsBefore.length > 0) {
			this.interceptorsBefore.forEach((interceptor)=> {
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
	
	private executeMiddleware(){
		this.middlewares.forEach(middleware => {
			this.server.use(middleware.use);
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
					response.status(error?.statusCode || response.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json(data);
				}
			});
		})
	}
	
	private executeInterceptorAfter() {
		this.interceptorsAfter.forEach(interceptor => {
			this.server.use((request,response) => {
				const data = interceptor.intercept({ response, request });
				if(data !== undefined) {
					response.status(200).json(data);
				}
			});
		});
	}
	
	public async start(port: number | string, callback: () => void) {
		// Event listeners
		this.appContext.start();
		const cors = require("cors");
		const rateLimit = require("express-rate-limit");
		if (cors) this.server.use(cors(this.corsOptions));
		if(rateLimit && this.rateLimitOptions) this.server.use(rateLimit(this.rateLimitOptions));
		this.executeMiddleware();
		this.executeInterceptorBefore();
		await this.registerController(this.controllerClasses, this.providers);
		this.executeInterceptorAfter();
		this.catch();
		this.httpServer.listen(port, callback);
	}
}
