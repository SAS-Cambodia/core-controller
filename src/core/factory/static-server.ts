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
import { CoreMiddleware, ErrorInterceptor, Interceptor } from "../../interface";
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
				
				if (typeof controllerInstance[methodName] === "function" && classMethod) {
					// classMethod "event" is method socket event
					if (classMethod !== "event") {
						const fileUpload = Reflect.getMetadata(DECORATOR_KEY.FILE_UPLOAD, controllerInstance, methodName);
						const args = [route_path];
						if (fileUpload) {
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
							} = fileUpload.options as FileUpload;
							
							const upload = multer({
								dest,
								storage,
								limits,
								preservePath,
								fileFilter
							});
							
							switch (type) {
								case "single":
									if (typeof keyField === "string") {
										args.push(upload.single(keyField));
									}
									break;
								case "array":
									if (typeof keyField === "string") {
										args.push(upload.array(keyField, maxCount));
									}
									break;
								case "fields":
									if (Array.isArray(keyField)) {
										args.push(upload.fields(keyField));
									}
									break;
								case "any" :
									args.push(upload.any());
									break;
								case "none" :
									args.push(upload.none());
									break;
							}
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
							})
						}
					}
					
					if (classMethod === "event") {
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
			}
			
			this.server.use(routePath, router);
			// Start socket namespace
			if (socketEvent.size > 0) {
				const subscribers = socketEvent.get(basePath);
				const getBusinessId = async () => {
					if (typeof subscribers?.instance["setBusinessId"] === "function") {
						return await subscribers.instance.setBusinessId()
					}
					return null;
				}
				const businessId = await getBusinessId();
				const socketRoom = businessId !== null ? `${basePath}-${businessId}` : basePath;
				if (this.options.enableLogging && businessId !== null) {
					logger.map(value => {
						if (value.BasePath === basePath) {
							value.BasePath = socketRoom;
						}
					})
				}
				const orderNamespace = this.socketServer.of(socketRoom);
				if (this.options.socketMiddleware) orderNamespace.use(this.options.socketMiddleware);
				if (subscribers) {
					orderNamespace.on('connection', (socket: Socket) => {
						subscribers.instance['onConnect'](socket);
						socket.on('disconnect', (reason) => subscribers.instance['onDisconnect'](socket, reason));
						subscribers.methods.forEach((methodName) => {
							const prototype = Object.getPrototypeOf(subscribers.instance);
							const socketIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_INSTANCE, controllerInstance, methodName);
							const callBackIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_CALLBACK, controllerInstance, methodName);
							const bodyIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_BODY, controllerInstance, methodName);
							const dataIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_DATA, controllerInstance, methodName);
							const keyDataIndex = Reflect.getMetadata(DECORATOR_KEY.SOCKET_DATA_KEY, controllerInstance, methodName);
							const event = Reflect.getMetadata(DECORATOR_KEY.ROUTE_PATH, prototype, methodName);
							const args: any[] = [];
							socket.on(event, async <T>(data: T, callback: SocketCallBack) => {
								try {
									if (socketIndex !== undefined) args[socketIndex] = orderNamespace;
									if (callBackIndex !== undefined && callback) args[callBackIndex] = callback;
									if (dataIndex !== undefined) args[dataIndex] = keyDataIndex ? socket.data[keyDataIndex] : data;
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
										}
										args[bodyIndex] = data;
									}
									await subscribers.instance[methodName](...args);
								} catch (e) {
									if(callback) callback(e);
								}
							});
						});
					});
				}
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
					response.status(response.statusCode).json(data);
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