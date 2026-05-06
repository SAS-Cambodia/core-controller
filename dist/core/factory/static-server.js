"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.CoreApplication = void 0;
const express_1 = __importStar(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const controller_1 = require("../../controller");
const app_context_1 = __importDefault(require("./app-context"));
const http_1 = __importDefault(require("http"));
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const http_error_exception_1 = require("../../http-error-exception");
const http_code_1 = require("../../enums/http-code");
const di_1 = require("../../di");
class CoreApplication {
    constructor(options) {
        this.options = options;
        this.corsOptions = {};
        this.interceptorsBefore = [];
        this.interceptorsAfter = [];
        this.interceptorError = [];
        this.middlewares = [];
        this.excludePrefix = [];
        const { SocketIO, socketOptions, providers, controllers } = this.options;
        this.controllerClasses = (0, controller_1.prepareController)(controllers);
        this.server = (0, express_1.default)();
        this.providers = providers;
        this.appContext = new app_context_1.default();
        this.httpServer = http_1.default.createServer(this.server);
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
    useGlobalMiddleware(...middlewares) {
        middlewares.forEach((instance) => {
            const middleware = new instance();
            if ((0, controller_1.isMiddleware)(middleware)) {
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
    get(target) {
        return di_1.container.resolve(target);
    }
    /**
     * Enables Cross-Origin Resource Sharing (CORS) for the server using the specified options.
     *
     * @param {CorsOptions | CorsOptionsDelegate} options - The configuration object or function used to set up CORS options.
     * @return {void} This method does not return a value.
     */
    enableCors(options) {
        this.corsOptions = options;
    }
    /**
     * Sets a global prefix for all routes in the application.
     * This prefix will be prepended to all controller paths unless specified in the exclude list.
     *
     * @param prefix - The global prefix to be applied to all routes.
     * @param excludePrefix - An optional array of route paths that should not have the global prefix applied.
     */
    setGlobalPrefix(prefix, excludePrefix) {
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
    useGlobalInterceptors(...interceptors) {
        interceptors.forEach((instance) => {
            const after = Reflect.getMetadata(controller_1.DECORATOR_KEY.AFTER_INTERCEPTOR, instance);
            const before = Reflect.getMetadata(controller_1.DECORATOR_KEY.BEFORE_INTERCEPTOR, instance);
            const interceptClass = new instance();
            if ((0, controller_1.isInterceptor)(interceptClass)) {
                if (after)
                    this.interceptorsAfter.push(interceptClass);
                if (before)
                    this.interceptorsBefore.push(interceptClass);
            }
            if ((0, controller_1.isInterceptorError)(interceptClass))
                this.interceptorError.push(interceptClass);
        });
    }
    registerController(controllers, providers) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const socketEvent = new Map();
            const logger = [];
            if (providers) {
                for (const ProviderClass of providers) {
                    di_1.container.register(ProviderClass);
                }
            }
            for (const ControllerClass of controllers) {
                const router = (0, express_1.Router)();
                // Inject providers into the controller constructor
                const controllerInstance = this.instantiateController(ControllerClass);
                const prototype = Object.getPrototypeOf(controllerInstance);
                const methods = Object.getOwnPropertyNames(prototype);
                const basePath = Reflect.getMetadata(controller_1.DECORATOR_KEY.CONTROLLER_PATH, ControllerClass);
                const controllerKey = Reflect.getMetadata(controller_1.DECORATOR_KEY.CONTROLLER, ControllerClass);
                if (![controller_1.DECORATOR_KEY.CONTROLLER, controller_1.DECORATOR_KEY.SOCKET].includes(controllerKey))
                    continue;
                if (!basePath) {
                    console.warn(`\x1b[43m [Warning] Controller ${ControllerClass.name} is missing a base path. \x1b[0m`);
                    continue;
                }
                if (!socketEvent.has(basePath) && controllerKey === controller_1.DECORATOR_KEY.SOCKET) {
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
                const routePath = ((_a = this.excludePrefix) === null || _a === void 0 ? void 0 : _a.includes(basePath)) ? basePath : this.prefix ? this.prefix + basePath : basePath;
                for (const methodName of methods) {
                    if (methodName === "constructor")
                        continue;
                    const route_path = Reflect.getMetadata(controller_1.DECORATOR_KEY.ROUTE_PATH, prototype, methodName) || "";
                    const classMethod = Reflect.getMetadata(controller_1.DECORATOR_KEY.METHOD, prototype, methodName);
                    if (typeof controllerInstance[methodName] === "function" && classMethod) {
                        // classMethod "event" is method socket event
                        if (classMethod !== "event") {
                            const fileUpload = Reflect.getMetadata(controller_1.DECORATOR_KEY.FILE_UPLOAD, controllerInstance, methodName);
                            const args = [route_path];
                            if (fileUpload) {
                                const multer = require("multer");
                                if (!multer)
                                    throw new Error("Invalid multer install");
                                const { keyField, storage, type, limits, dest, preservePath, fileFilter, maxCount } = fileUpload.options;
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
                                    case "any":
                                        args.push(upload.any());
                                        break;
                                    case "none":
                                        args.push(upload.none());
                                        break;
                                }
                            }
                            args.push(controller_1.executeRoute.bind({
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
                        if (classMethod === "event") {
                            (_b = socketEvent.get(basePath)) === null || _b === void 0 ? void 0 : _b.methods.push(methodName);
                            if (this.options.enableLogging) {
                                logger.push({
                                    BasePath: basePath,
                                    Event: route_path,
                                    ControllerName: ControllerClass.name,
                                    ImplementMethod: methodName,
                                    Type: "SOCKET"
                                });
                            }
                        }
                    }
                }
                this.server.use(routePath, router);
                // Start socket namespace
                if (socketEvent.size > 0) {
                    const subscribers = socketEvent.get(basePath);
                    const getBusinessId = () => __awaiter(this, void 0, void 0, function* () {
                        if (typeof (subscribers === null || subscribers === void 0 ? void 0 : subscribers.instance["setBusinessId"]) === "function") {
                            return yield subscribers.instance.setBusinessId();
                        }
                        return null;
                    });
                    const businessId = yield getBusinessId();
                    const socketRoom = businessId !== null ? `${basePath}-${businessId}` : basePath;
                    if (this.options.enableLogging && businessId !== null) {
                        logger.map(value => {
                            if (value.BasePath === basePath) {
                                value.BasePath = socketRoom;
                            }
                        });
                    }
                    const orderNamespace = this.socketServer.of(socketRoom);
                    if (this.options.socketMiddleware)
                        orderNamespace.use(this.options.socketMiddleware);
                    if (subscribers) {
                        orderNamespace.on('connection', (socket) => {
                            subscribers.instance['onConnect'](socket);
                            socket.on('disconnect', (reason) => subscribers.instance['onDisconnect'](socket, reason));
                            subscribers.methods.forEach((methodName) => {
                                const prototype = Object.getPrototypeOf(subscribers.instance);
                                const socketIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_INSTANCE, controllerInstance, methodName);
                                const callBackIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_CALLBACK, controllerInstance, methodName);
                                const bodyIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_BODY, controllerInstance, methodName);
                                const dataIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_DATA, controllerInstance, methodName);
                                const keyDataIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_DATA_KEY, controllerInstance, methodName);
                                const event = Reflect.getMetadata(controller_1.DECORATOR_KEY.ROUTE_PATH, prototype, methodName);
                                const args = [];
                                socket.on(event, (data, callback) => __awaiter(this, void 0, void 0, function* () {
                                    try {
                                        if (socketIndex !== undefined)
                                            args[socketIndex] = orderNamespace;
                                        if (callBackIndex !== undefined && callback)
                                            args[callBackIndex] = callback;
                                        if (dataIndex !== undefined)
                                            args[dataIndex] = keyDataIndex ? socket.data[keyDataIndex] : data;
                                        if (bodyIndex !== undefined) {
                                            const ResBodyType = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUEST_BODY_TYPE, controllerInstance, methodName);
                                            const ResBodyTypeOptions = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUEST_BODY_OPTIONS, controllerInstance, methodName);
                                            if (ResBodyType) {
                                                const instance = (0, class_transformer_1.plainToInstance)(ResBodyType, data, ResBodyTypeOptions);
                                                const errors = yield (0, class_validator_1.validate)(instance);
                                                if (errors.length > 0) {
                                                    const error = new http_error_exception_1.HttpError('Validation Error', http_code_1.HttpStatusCode.FORBIDDEN, errors[0]);
                                                    error.stack = JSON.stringify(errors[0]);
                                                    return callback(error);
                                                }
                                            }
                                            args[bodyIndex] = data;
                                        }
                                        yield subscribers.instance[methodName](...args);
                                    }
                                    catch (e) {
                                        if (callback)
                                            callback(e);
                                    }
                                }));
                            });
                        });
                    }
                }
            }
            if (this.options.enableLogging)
                console.table(logger);
        });
    }
    // Helper method to instantiate controllers with injected providers
    instantiateController(ControllerClass) {
        const paramTypes = Reflect.getMetadata("design:paramtypes", ControllerClass) || [];
        const dependencies = paramTypes.map(type => di_1.container.resolve(type) || null);
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
    setBodyParserOptions(options) {
        this.server.use(express_1.default.json());
        let config;
        // @ts-ignore
        for (let key in options)
            config = body_parser_1.default[key](options[key]);
        if (config)
            this.server.use(config);
    }
    /**
     * Sets the rate limit configuration for the instance.
     *
     * @param {Partial<RateOptions>} options - An object containing partial properties of the rate options configuration.
     * @return {void} This method does not return a value.
     */
    setRateLimit(options) {
        this.rateLimitOptions = options;
    }
    executeInterceptorBefore() {
        if (this.interceptorsBefore.length > 0) {
            this.interceptorsBefore.forEach((interceptor) => {
                this.server.use((request, response, next) => {
                    this.appContext.onEmitInterceptor({
                        method: request.method,
                        url: request.url,
                        startTime: new Date(),
                        interceptor,
                        response,
                        request
                    });
                    next();
                });
            });
        }
    }
    executeMiddleware() {
        this.middlewares.forEach(middleware => {
            this.server.use(middleware.use);
        });
    }
    catch() {
        this.interceptorError.forEach((instance) => {
            this.server.use((error, request, response, next) => {
                const data = instance.catch({
                    error,
                    request,
                    response,
                    next
                });
                if (data !== undefined) {
                    response.status(response.statusCode).json(data);
                }
            });
        });
    }
    executeInterceptorAfter() {
        this.interceptorsAfter.forEach(interceptor => {
            this.server.use((request, response) => {
                const data = interceptor.intercept({ response, request });
                if (data !== undefined) {
                    response.status(200).json(data);
                }
            });
        });
    }
    start(port, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            // Event listeners
            this.appContext.start();
            const cors = require("cors");
            const rateLimit = require("express-rate-limit");
            if (cors)
                this.server.use(cors(this.corsOptions));
            if (rateLimit && this.rateLimitOptions)
                this.server.use(rateLimit(this.rateLimitOptions));
            this.executeMiddleware();
            this.executeInterceptorBefore();
            yield this.registerController(this.controllerClasses, this.providers);
            this.executeInterceptorAfter();
            this.catch();
            this.httpServer.listen(port, callback);
        });
    }
}
exports.CoreApplication = CoreApplication;
