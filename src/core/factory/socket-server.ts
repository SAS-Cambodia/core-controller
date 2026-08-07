import { Server as ServerSK, Socket } from "socket.io";
import http, {
	IncomingMessage,
	Server as HttpServer,
	ServerResponse
} from "http";
import { CorsOptions, CorsOptionsDelegate } from "cors";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
	DECORATOR_KEY,
	isSocketMiddleware,
	prepareController
} from "../../controller";
import { AccessControlGuard, CoreSocketMiddleware, PlanAccessControlGuard } from "../../interface";
import { HttpError } from "../../http-error-exception";
import { HttpStatusCode } from "../../enums/http-code";
import { ProviderTarget, RouteInfo, SocketCallBack } from "../../type";
import { container } from "../../di";
import { ServerAdapter } from "./server-adapter";
import { socketServerAppOptions } from "./index";
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

export class SocketApplication {

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
	public socketServer!: ServerSK;
	private accessControlGuard?: AccessControlGuard;
	private planGuard?: PlanAccessControlGuard;
	private corsOptions?: CorsOptions | CorsOptionsDelegate;
	private readonly middlewares: CoreSocketMiddleware[] = [];
	private readonly adapter?: ServerAdapter;
	private readonly httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse>;
	private readonly controllerClasses: Function[];
	private started = false;

	constructor(private options: socketServerAppOptions) {
		const {
			providers,
			controllers,
			adapter
		} = this.options;
		this.controllerClasses = prepareController(controllers);
		this.adapter = adapter;
		// Registered immediately (not deferred to start()) so a provider declared
		// here is resolvable by any other app sharing the same adapter regardless
		// of which app's start() runs first — the DI container is a process-wide
		// singleton, so this is effectively whole-app provider sharing.
		registerProviders(providers);
		this.httpServer = adapter ? adapter.getHttpServer() : http.createServer();
		if (adapter) {
			adapter.attach(this);
		}
	}

	/**
	 * Registers the role-resolution guard used to enforce @AccessControl() on
	 * socket events. Independent of the guard registered on a CoreApplication
	 * sharing the same adapter — guard state isn't shared between apps, so a
	 * guarded @SocketController event needs its guard registered here too.
	 *
	 * Must be called before start(), since @AccessControl-guarded events are
	 * validated against this guard during namespace registration.
	 */
	public useAccessControl(guard: new (...args: any[]) => AccessControlGuard) {
		this.accessControlGuard = new guard();
	}

	/**
	 * Registers the plan-resolution guard used to enforce @RequirePlan() on
	 * socket events. Must be called before start().
	 */
	public usePlanAccessControl(guard: new (...args: any[]) => PlanAccessControlGuard) {
		this.planGuard = new guard();
	}

	/**
	 * Registers global socket middleware to be used across all socket namespaces.
	 * Each middleware is instantiated and added to the middleware stack if it meets the criteria.
	 *
	 * Must be called before start(), since middleware is applied to each namespace
	 * as it's registered during registerSocketNamespace().
	 *
	 * @param middlewares - A list of socket middleware classes to be instantiated and used globally.
	 */
	public useGlobalMiddleware(...middlewares: any[]) {
		middlewares.forEach((instance) => {
			const middleware = new instance();
			if (isSocketMiddleware(middleware)) {
				this.middlewares.push(middleware);
			}
		});
	}

	/**
	 * Enables Cross-Origin Resource Sharing (CORS) for the socket server.
	 * Must be called before start() — Socket.IO bakes its CORS handling into
	 * the server at construction time, so this only takes effect because the
	 * underlying Socket.IO Server is itself constructed inside start(), not here.
	 */
	public enableCors(options: CorsOptions | CorsOptionsDelegate): void {
		this.corsOptions = options;
	}

	/**
	 * Retrieves an instance of the given provider target from the container.
	 */
	public get<T>(target: ProviderTarget<T>): T {
		return container.resolve<T>(target);
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
		const accessControlRoles = resolveAccessControlRoles(methodRoles, classRoles);
		const methodPlans = Reflect.getMetadata(DECORATOR_KEY.REQUIRE_PLAN, prototype, methodName);
		const classPlans = Reflect.getMetadata(DECORATOR_KEY.REQUIRE_PLAN, subscribers.instance.constructor);
		const requiredPlans = resolvePlanRequirement(methodPlans, classPlans);
		const guards = resolveGuards(prototype, subscribers.instance.constructor, methodName);
		const args: any[] = [];

		socket.on(event, async <T>(data: T, callback: SocketCallBack) => {
			try {
				if (accessControlRoles !== undefined) {
					const resolvedRoles = await this.accessControlGuard!.resolveRoles({ socket, data });
					if (!hasRequiredMatch(accessControlRoles, resolvedRoles)) {
						return callback ? callback(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN)) : undefined;
					}
				}
				if (requiredPlans !== undefined) {
					const resolvedPlans = await this.planGuard!.resolvePlans({ socket, data });
					if (!hasRequiredMatch(requiredPlans, resolvedPlans)) {
						return callback ? callback(new HttpError('Forbidden', HttpStatusCode.FORBIDDEN)) : undefined;
					}
				}
				if (guards.length > 0) {
					const allowed = await runGuards(guards, { socket, data });
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
		logger: RouteInfo[]
	) {
		const getBusinessId = async () => {
			if (typeof subscribers?.instance["setBusinessId"] === "function") {
				return await subscribers.instance.setBusinessId();
			}
			return null;
		};
		const businessId = await getBusinessId();
		const socketRoom = businessId !== null ? `${basePath}-${businessId}` : basePath;

		if (businessId !== null) {
			logger.forEach((value) => {
				if (value.BasePath === basePath) {
					value.BasePath = socketRoom;
				}
			});
		}

		const orderNamespace = this.socketServer.of(socketRoom);
		this.middlewares.forEach((middleware) => orderNamespace.use(middleware.use.bind(middleware)));
		if (!subscribers) return;

		const subscribersPrototype = Object.getPrototypeOf(subscribers.instance);
		subscribers.methods.forEach((methodName) => {
			const methodRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, subscribersPrototype, methodName);
			const classRoles = Reflect.getMetadata(DECORATOR_KEY.ACCESS_CONTROL, subscribers.instance.constructor);
			const accessControlRoles = resolveAccessControlRoles(methodRoles, classRoles);
			if (accessControlRoles !== undefined) {
				requireAccessControlGuard(this.accessControlGuard, `Socket event "${methodName}"`);
			}

			const methodPlans = Reflect.getMetadata(DECORATOR_KEY.REQUIRE_PLAN, subscribersPrototype, methodName);
			const classPlans = Reflect.getMetadata(DECORATOR_KEY.REQUIRE_PLAN, subscribers.instance.constructor);
			const requiredPlans = resolvePlanRequirement(methodPlans, classPlans);
			if (requiredPlans !== undefined) {
				requirePlanGuard(this.planGuard, `Socket event "${methodName}"`);
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

	private async registerController(controllers: any[]): Promise<RouteInfo[]> {
		const socketEvent = new Map<string, { instance: any, methods: string[] }>();
		const logger: RouteInfo[] = [];

		for (const ControllerClass of controllers) {
			const controllerInstance = instantiateController(ControllerClass);
			const prototype = Object.getPrototypeOf(controllerInstance);
			const methods = Object.getOwnPropertyNames(prototype);
			const basePath = Reflect.getMetadata(DECORATOR_KEY.CONTROLLER_PATH, ControllerClass);
			const controllerKey = Reflect.getMetadata(DECORATOR_KEY.CONTROLLER, ControllerClass);

			if (controllerKey !== DECORATOR_KEY.SOCKET) continue;

			if (!basePath) {
				console.warn(`\x1b[43m [Warning] Controller ${ControllerClass.name} is missing a base path. \x1b[0m`);
				continue;
			}

			if (!socketEvent.has(basePath)) {
				socketEvent.set(basePath, {
					instance: controllerInstance,
					methods: []
				});

				logger.push({
					BasePath: basePath,
					Event: "ROOT",
					ControllerName: ControllerClass.name,
					ImplementMethod: "onConnect",
					Type: "SOCKET"
				});
			}

			for (const methodName of methods) {
				if (methodName === "constructor") continue;
				const route_path = Reflect.getMetadata(DECORATOR_KEY.ROUTE_PATH, prototype, methodName) || "";
				const classMethod = Reflect.getMetadata(DECORATOR_KEY.METHOD, prototype, methodName);

				if (typeof controllerInstance[methodName] !== "function" || !classMethod || classMethod !== "event") continue;

				socketEvent.get(basePath)?.methods.push(methodName);
				logger.push({
					BasePath: basePath,
					Event: route_path,
					ControllerName: ControllerClass.name,
					ImplementMethod: methodName,
					Type: "SOCKET"
				});
			}

			await this.registerSocketNamespace(basePath, socketEvent.get(basePath), controllerInstance, logger);
		}

		return logger;
	}

	/**
	 * Hands the full registered socket route list to any middleware implementing
	 * the optional `setRoutes()` method, once controller/namespace registration
	 * has finished and before the server starts listening.
	 */
	private notifyMiddlewareRoutes(routes: RouteInfo[]): void {
		this.middlewares.forEach((middleware) => {
			if (typeof middleware.setRoutes === "function") {
				middleware.setRoutes(routes);
			}
		});
	}

	public async start(): Promise<void>;
	public async start(port: number | string, callback?: () => void): Promise<void>;
	public async start(port?: number | string, callback?: () => void): Promise<void> {
		if (this.adapter) {
			if (port !== undefined) {
				throw new Error("[SocketApplication] start(port) was called but this app is attached to a shared ServerAdapter (createSocketServer({ adapter })). The adapter owns port binding and automatically starts every attached app when you call adapter.listen(port, callback) — you no longer need to call app.start() yourself, though doing so with no arguments is still harmless.");
			}
		} else if (port === undefined) {
			throw new Error("[SocketApplication] start(port) requires a port when no adapter is attached. Pass a port, or attach a ServerAdapter via createSocketServer({ adapter }) and call adapter.listen(port, callback) instead.");
		}

		if (this.started) return;
		this.started = true;

		const { SocketIO, socketOptions } = this.options;
		this.socketServer = new SocketIO(this.httpServer, {
			...socketOptions,
			...(this.corsOptions !== undefined ? { cors: this.corsOptions } : {})
		});

		const routes = await this.registerController(this.controllerClasses);
		this.notifyMiddlewareRoutes(routes);
		if (this.options.enableLogging) console.table(routes);

		if (!this.adapter) {
			this.httpServer.listen(port!, callback);
		}
	}
}
