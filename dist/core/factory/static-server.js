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
        this.interceptors = [];
        this.interceptorError = [];
        this.requestLoggingEnabled = false;
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
    useAccessControl(guard) {
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
    usePlanAccessControl(guard) {
        this.planGuard = new guard();
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
     * Enables logging of incoming requests — one line per request, printed when
     * the response finishes, showing method, path, status code, and duration.
     * Intended for development use.
     */
    enableRequestLogging() {
        this.requestLoggingEnabled = true;
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
    useGlobalInterceptors(...interceptors) {
        interceptors.forEach((instance) => {
            const interceptorInstance = new instance();
            if ((0, controller_1.isInterceptor)(interceptorInstance)) {
                const isResponseInterceptor = Reflect.getMetadata(controller_1.DECORATOR_KEY.RESPONSE_INTERCEPTOR, instance);
                if (!isResponseInterceptor) {
                    throw new Error(`[Interceptor] ${instance.name} implements intercept() but has no @ResponseInterceptor() applied — it will never run.`);
                }
                this.interceptors.push(interceptorInstance);
            }
            if ((0, controller_1.isInterceptorError)(interceptorInstance))
                this.interceptorError.push(interceptorInstance);
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
    useNotFoundHandler(handler) {
        this.notFoundHandler = new handler();
    }
    /**
     * Resolves the effective @AccessControl role list for a method, falling back
     * to the class-level roles when the method itself isn't annotated.
     */
    resolveAccessControlRoles(methodRoles, classRoles) {
        return methodRoles !== undefined ? methodRoles : classRoles;
    }
    /**
     * Resolves the effective @RequirePlan list for a method, falling back
     * to the class-level plans when the method itself isn't annotated —
     * same fallback semantics as resolveAccessControlRoles.
     */
    resolvePlanRequirement(methodPlans, classPlans) {
        return methodPlans !== undefined ? methodPlans : classPlans;
    }
    /**
     * Set-membership check shared by @AccessControl and @RequirePlan: an empty
     * requirement list just means "must resolve to something", otherwise the
     * resolved list must intersect the required list.
     */
    hasRequiredMatch(required, resolved) {
        return required.length === 0
            ? resolved.length > 0
            : resolved.some((value) => required.includes(value));
    }
    /**
     * Returns the registered AccessControlGuard or throws, since guarded routes/events
     * are only valid once useAccessControl() has been called.
     */
    requireAccessControlGuard(label) {
        if (!this.accessControlGuard) {
            throw new Error(`[AccessControl] ${label} requires @AccessControl but no guard was registered. Call app.useAccessControl(YourGuard) before app.start().`);
        }
        return this.accessControlGuard;
    }
    /**
     * Returns the registered PlanAccessControlGuard or throws, since @RequirePlan-guarded
     * routes/events are only valid once usePlanAccessControl() has been called.
     */
    requirePlanGuard(label) {
        if (!this.planGuard) {
            throw new Error(`[RequirePlan] ${label} requires @RequirePlan but no guard was registered. Call app.usePlanAccessControl(YourGuard) before app.start().`);
        }
        return this.planGuard;
    }
    buildHttpAccessControlMiddleware(accessControlRoles, label) {
        const guard = this.requireAccessControlGuard(label);
        return (request, response, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const resolvedRoles = yield guard.resolveRoles({ request, response });
                if (!this.hasRequiredMatch(accessControlRoles, resolvedRoles)) {
                    return next(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN));
                }
                next();
            }
            catch (e) {
                next(e);
            }
        });
    }
    buildHttpPlanMiddleware(requiredPlans, label) {
        const guard = this.requirePlanGuard(label);
        return (request, response, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const resolvedPlans = yield guard.resolvePlans({ request, response });
                if (!this.hasRequiredMatch(requiredPlans, resolvedPlans)) {
                    return next(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN));
                }
                next();
            }
            catch (e) {
                next(e);
            }
        });
    }
    /**
     * Collects @UseGuards() guards from class + method level (both run, unlike
     * @AccessControl's method-overrides-class semantics) and instantiates them.
     */
    resolveGuards(prototype, ctor, methodName) {
        const classGuards = Reflect.getMetadata(controller_1.DECORATOR_KEY.GUARDS, ctor) || [];
        const methodGuards = Reflect.getMetadata(controller_1.DECORATOR_KEY.GUARDS, prototype, methodName) || [];
        return [...classGuards, ...methodGuards].map((GuardClass) => new GuardClass());
    }
    runGuards(guards, context) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const guard of guards) {
                if (!(yield guard.canActivate(context)))
                    return false;
            }
            return true;
        });
    }
    buildFileUploadMiddleware(fileUpload) {
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
    registerHttpRoute(router, ControllerClass, controllerInstance, prototype, methodName, classMethod, route_path, routePath, logger) {
        const fileUpload = Reflect.getMetadata(controller_1.DECORATOR_KEY.FILE_UPLOAD, controllerInstance, methodName);
        const args = [route_path];
        if (fileUpload) {
            const uploadMiddleware = this.buildFileUploadMiddleware(fileUpload);
            if (uploadMiddleware)
                args.push(uploadMiddleware);
        }
        const methodRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, prototype, methodName);
        const classRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, ControllerClass);
        const accessControlRoles = this.resolveAccessControlRoles(methodRoles, classRoles);
        if (accessControlRoles !== undefined) {
            args.push(this.buildHttpAccessControlMiddleware(accessControlRoles, `${ControllerClass.name}.${methodName}`));
        }
        const methodPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, prototype, methodName);
        const classPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, ControllerClass);
        const requiredPlans = this.resolvePlanRequirement(methodPlans, classPlans);
        if (requiredPlans !== undefined) {
            args.push(this.buildHttpPlanMiddleware(requiredPlans, `${ControllerClass.name}.${methodName}`));
        }
        const guards = this.resolveGuards(prototype, ControllerClass, methodName);
        if (guards.length > 0) {
            args.push((request, response, next) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const allowed = yield this.runGuards(guards, { request, response });
                    if (!allowed) {
                        return next(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN));
                    }
                    next();
                }
                catch (e) {
                    next(e);
                }
            }));
        }
        args.push(controller_1.executeRoute.bind({
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
    /**
     * Marshals args (@SocketInstance/@SocketCallback/@SocketData/@SocketBody), enforces
     * @AccessControl, validates @SocketBody, and binds a single socket event listener.
     */
    bindSocketEvent(orderNamespace, socket, controllerInstance, subscribers, methodName) {
        const prototype = Object.getPrototypeOf(subscribers.instance);
        const socketIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_INSTANCE, controllerInstance, methodName);
        const callBackIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_CALLBACK, controllerInstance, methodName);
        const bodyIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_BODY, controllerInstance, methodName);
        const dataIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_DATA, controllerInstance, methodName);
        const keyDataIndex = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_DATA_KEY, controllerInstance, methodName);
        const socketQueryMeta = Reflect.getMetadata(controller_1.DECORATOR_KEY.SOCKET_QUERY, controllerInstance, methodName) || [];
        const event = Reflect.getMetadata(controller_1.DECORATOR_KEY.ROUTE_PATH, prototype, methodName);
        const methodRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, prototype, methodName);
        const classRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, subscribers.instance.constructor);
        const accessControlRoles = this.resolveAccessControlRoles(methodRoles, classRoles);
        const methodPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, prototype, methodName);
        const classPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, subscribers.instance.constructor);
        const requiredPlans = this.resolvePlanRequirement(methodPlans, classPlans);
        const guards = this.resolveGuards(prototype, subscribers.instance.constructor, methodName);
        const args = [];
        socket.on(event, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (accessControlRoles !== undefined) {
                    const resolvedRoles = yield this.accessControlGuard.resolveRoles({ socket, data });
                    if (!this.hasRequiredMatch(accessControlRoles, resolvedRoles)) {
                        return callback ? callback(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN)) : undefined;
                    }
                }
                if (requiredPlans !== undefined) {
                    const resolvedPlans = yield this.planGuard.resolvePlans({ socket, data });
                    if (!this.hasRequiredMatch(requiredPlans, resolvedPlans)) {
                        return callback ? callback(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN)) : undefined;
                    }
                }
                if (guards.length > 0) {
                    const allowed = yield this.runGuards(guards, { socket, data });
                    if (!allowed) {
                        return callback ? callback(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN)) : undefined;
                    }
                }
                if (socketIndex !== undefined)
                    args[socketIndex] = orderNamespace;
                if (callBackIndex !== undefined && callback)
                    args[callBackIndex] = callback;
                if (dataIndex !== undefined)
                    args[dataIndex] = keyDataIndex ? socket.data[keyDataIndex] : data;
                socketQueryMeta.forEach(({ queryKey, queryIndex }) => {
                    args[queryIndex] = queryKey ? socket.handshake.query[queryKey] : socket.handshake.query;
                });
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
                        args[bodyIndex] = instance;
                    }
                    else {
                        args[bodyIndex] = data;
                    }
                }
                yield subscribers.instance[methodName](...args);
            }
            catch (e) {
                if (callback)
                    callback(e);
            }
        }));
    }
    /**
     * Resolves (or creates) the socket namespace for basePath, registers @AccessControl
     * pre-checks, and binds connection/event listeners for its subscribers.
     */
    registerSocketNamespace(basePath, subscribers, controllerInstance, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const getBusinessId = () => __awaiter(this, void 0, void 0, function* () {
                if (typeof (subscribers === null || subscribers === void 0 ? void 0 : subscribers.instance["setBusinessId"]) === "function") {
                    return yield subscribers.instance.setBusinessId();
                }
                return null;
            });
            const businessId = yield getBusinessId();
            const socketRoom = businessId !== null ? `${basePath}-${businessId}` : basePath;
            if (businessId !== null) {
                logger.forEach((value) => {
                    if (value.BasePath === basePath) {
                        value.BasePath = socketRoom;
                    }
                });
            }
            const orderNamespace = this.socketServer.of(socketRoom);
            if (this.options.socketMiddleware)
                orderNamespace.use(this.options.socketMiddleware);
            if (!subscribers)
                return;
            const subscribersPrototype = Object.getPrototypeOf(subscribers.instance);
            subscribers.methods.forEach((methodName) => {
                const methodRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, subscribersPrototype, methodName);
                const classRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, subscribers.instance.constructor);
                const accessControlRoles = this.resolveAccessControlRoles(methodRoles, classRoles);
                if (accessControlRoles !== undefined) {
                    this.requireAccessControlGuard(`Socket event "${methodName}"`);
                }
                const methodPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, subscribersPrototype, methodName);
                const classPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, subscribers.instance.constructor);
                const requiredPlans = this.resolvePlanRequirement(methodPlans, classPlans);
                if (requiredPlans !== undefined) {
                    this.requirePlanGuard(`Socket event "${methodName}"`);
                }
            });
            orderNamespace.on('connection', (socket) => {
                subscribers.instance['onConnect'](socket);
                socket.on('disconnect', (reason) => subscribers.instance['onDisconnect'](socket, reason));
                subscribers.methods.forEach((methodName) => {
                    this.bindSocketEvent(orderNamespace, socket, controllerInstance, subscribers, methodName);
                });
            });
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
                    logger.push({
                        BasePath: basePath,
                        Event: "ROOT",
                        ControllerName: ControllerClass.name,
                        ImplementMethod: "onConnect",
                        Type: "SOCKET"
                    });
                }
                // Start config Route Api
                const routePath = ((_a = this.excludePrefix) === null || _a === void 0 ? void 0 : _a.includes(basePath)) ? basePath : this.prefix ? this.prefix + basePath : basePath;
                for (const methodName of methods) {
                    if (methodName === "constructor")
                        continue;
                    const route_path = Reflect.getMetadata(controller_1.DECORATOR_KEY.ROUTE_PATH, prototype, methodName) || "";
                    const classMethod = Reflect.getMetadata(controller_1.DECORATOR_KEY.METHOD, prototype, methodName);
                    if (typeof controllerInstance[methodName] !== "function" || !classMethod)
                        continue;
                    // classMethod "event" is method socket event
                    if (classMethod !== "event") {
                        this.registerHttpRoute(router, ControllerClass, controllerInstance, prototype, methodName, classMethod, route_path, routePath, logger);
                    }
                    else {
                        (_b = socketEvent.get(basePath)) === null || _b === void 0 ? void 0 : _b.methods.push(methodName);
                        logger.push({
                            BasePath: basePath,
                            Event: route_path,
                            ControllerName: ControllerClass.name,
                            ImplementMethod: methodName,
                            Type: "SOCKET"
                        });
                    }
                }
                this.server.use(routePath, router);
                // Start socket namespace
                if (socketEvent.size > 0) {
                    yield this.registerSocketNamespace(basePath, socketEvent.get(basePath), controllerInstance, logger);
                }
            }
            if (this.options.enableLogging)
                console.table(logger);
            return logger;
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
    /**
     * Sets the HTTP status code used when a caught error shouldn't dictate the
     * wire status itself — either because it has no `statusCode` at all, or it
     * was thrown as `new HttpError(message, code, details, { bodyOnly: true })`,
     * meaning `code` is a business/error code meant for the response body, not
     * the actual HTTP status. Defaults to 500 until configured.
     *
     * @param statusCode - The default HTTP status code for such error responses.
     */
    setDefaultErrorStatusCode(statusCode) {
        this.defaultErrorStatusCode = statusCode;
    }
    applyRequestLogging() {
        if (!this.requestLoggingEnabled)
            return;
        this.server.use((request, response, next) => {
            const startTime = Date.now();
            response.on('finish', () => {
                const duration = Date.now() - startTime;
                console.log(`[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${duration}ms Body: ${JSON.stringify(request.body)}`);
            });
            next();
        });
    }
    applyCors() {
        const cors = require("cors");
        this.server.use(cors(this.corsOptions));
    }
    applyRateLimit() {
        if (!this.rateLimitOptions)
            return;
        const rateLimit = require("express-rate-limit");
        this.server.use(rateLimit(this.rateLimitOptions));
    }
    executeMiddleware() {
        this.middlewares.forEach(middleware => {
            this.server.use(middleware.use);
        });
    }
    /**
     * Hands the full registered route list (HTTP API + Socket.IO events) to any
     * middleware implementing the optional `setRoutes()` method, once controller
     * registration has finished and before the server starts listening.
     */
    notifyMiddlewareRoutes(routes) {
        this.middlewares.forEach((middleware) => {
            if (typeof middleware.setRoutes === "function") {
                middleware.setRoutes(routes);
            }
        });
    }
    registerResponseInterceptors() {
        if (this.interceptors.length > 0) {
            this.interceptors.forEach((interceptor) => {
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
    applyNotFoundHandler() {
        if (!this.notFoundHandler)
            return;
        this.server.use((request, response) => {
            const data = this.notFoundHandler.handle({ response, request });
            if (data !== undefined) {
                response.status(http_code_1.HttpStatusCode.NOT_FOUND).json(data);
            }
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
                    const useErrorStatusCode = (error === null || error === void 0 ? void 0 : error.statusCode) !== undefined && !(error === null || error === void 0 ? void 0 : error.bodyOnly);
                    const statusCode = this.defaultErrorStatusCode ? this.defaultErrorStatusCode : useErrorStatusCode ? error.statusCode : response.statusCode;
                    response.status(statusCode).json(data);
                }
            });
        });
    }
    start(port, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.appContext.start();
            this.applyRequestLogging();
            this.applyCors();
            this.applyRateLimit();
            this.executeMiddleware();
            this.registerResponseInterceptors();
            const routes = yield this.registerController(this.controllerClasses, this.providers);
            this.notifyMiddlewareRoutes(routes);
            this.applyNotFoundHandler();
            this.catch();
            this.httpServer.listen(port, callback);
        });
    }
}
exports.CoreApplication = CoreApplication;
