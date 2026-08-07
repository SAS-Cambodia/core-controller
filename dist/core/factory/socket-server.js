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
exports.SocketApplication = void 0;
const http_1 = __importDefault(require("http"));
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const controller_1 = require("../../controller");
const http_error_exception_1 = require("../../http-error-exception");
const http_code_1 = require("../../enums/http-code");
const di_1 = require("../../di");
const registration_helpers_1 = require("./shared/registration-helpers");
class SocketApplication {
    constructor(options) {
        this.options = options;
        this.middlewares = [];
        this.started = false;
        const { providers, controllers, adapter } = this.options;
        this.controllerClasses = (0, controller_1.prepareController)(controllers);
        this.adapter = adapter;
        // Registered immediately (not deferred to start()) so a provider declared
        // here is resolvable by any other app sharing the same adapter regardless
        // of which app's start() runs first — the DI container is a process-wide
        // singleton, so this is effectively whole-app provider sharing.
        (0, registration_helpers_1.registerProviders)(providers);
        this.httpServer = adapter ? adapter.getHttpServer() : http_1.default.createServer();
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
    useAccessControl(guard) {
        this.accessControlGuard = new guard();
    }
    /**
     * Registers the plan-resolution guard used to enforce @RequirePlan() on
     * socket events. Must be called before start().
     */
    usePlanAccessControl(guard) {
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
    useGlobalMiddleware(...middlewares) {
        middlewares.forEach((instance) => {
            const middleware = new instance();
            if ((0, controller_1.isSocketMiddleware)(middleware)) {
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
    enableCors(options) {
        this.corsOptions = options;
    }
    /**
     * Retrieves an instance of the given provider target from the container.
     */
    get(target) {
        return di_1.container.resolve(target);
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
        const accessControlRoles = (0, registration_helpers_1.resolveAccessControlRoles)(methodRoles, classRoles);
        const methodPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, prototype, methodName);
        const classPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, subscribers.instance.constructor);
        const requiredPlans = (0, registration_helpers_1.resolvePlanRequirement)(methodPlans, classPlans);
        const guards = (0, registration_helpers_1.resolveGuards)(prototype, subscribers.instance.constructor, methodName);
        const args = [];
        socket.on(event, (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (accessControlRoles !== undefined) {
                    const resolvedRoles = yield this.accessControlGuard.resolveRoles({ socket, data });
                    if (!(0, registration_helpers_1.hasRequiredMatch)(accessControlRoles, resolvedRoles)) {
                        return callback ? callback(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN)) : undefined;
                    }
                }
                if (requiredPlans !== undefined) {
                    const resolvedPlans = yield this.planGuard.resolvePlans({ socket, data });
                    if (!(0, registration_helpers_1.hasRequiredMatch)(requiredPlans, resolvedPlans)) {
                        return callback ? callback(new http_error_exception_1.HttpError('Forbidden', http_code_1.HttpStatusCode.FORBIDDEN)) : undefined;
                    }
                }
                if (guards.length > 0) {
                    const allowed = yield (0, registration_helpers_1.runGuards)(guards, { socket, data });
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
            this.middlewares.forEach((middleware) => orderNamespace.use(middleware.use.bind(middleware)));
            if (!subscribers)
                return;
            const subscribersPrototype = Object.getPrototypeOf(subscribers.instance);
            subscribers.methods.forEach((methodName) => {
                const methodRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, subscribersPrototype, methodName);
                const classRoles = Reflect.getMetadata(controller_1.DECORATOR_KEY.ACCESS_CONTROL, subscribers.instance.constructor);
                const accessControlRoles = (0, registration_helpers_1.resolveAccessControlRoles)(methodRoles, classRoles);
                if (accessControlRoles !== undefined) {
                    (0, registration_helpers_1.requireAccessControlGuard)(this.accessControlGuard, `Socket event "${methodName}"`);
                }
                const methodPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, subscribersPrototype, methodName);
                const classPlans = Reflect.getMetadata(controller_1.DECORATOR_KEY.REQUIRE_PLAN, subscribers.instance.constructor);
                const requiredPlans = (0, registration_helpers_1.resolvePlanRequirement)(methodPlans, classPlans);
                if (requiredPlans !== undefined) {
                    (0, registration_helpers_1.requirePlanGuard)(this.planGuard, `Socket event "${methodName}"`);
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
    registerController(controllers) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const socketEvent = new Map();
            const logger = [];
            for (const ControllerClass of controllers) {
                const controllerInstance = (0, registration_helpers_1.instantiateController)(ControllerClass);
                const prototype = Object.getPrototypeOf(controllerInstance);
                const methods = Object.getOwnPropertyNames(prototype);
                const basePath = Reflect.getMetadata(controller_1.DECORATOR_KEY.CONTROLLER_PATH, ControllerClass);
                const controllerKey = Reflect.getMetadata(controller_1.DECORATOR_KEY.CONTROLLER, ControllerClass);
                if (controllerKey !== controller_1.DECORATOR_KEY.SOCKET)
                    continue;
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
                    if (methodName === "constructor")
                        continue;
                    const route_path = Reflect.getMetadata(controller_1.DECORATOR_KEY.ROUTE_PATH, prototype, methodName) || "";
                    const classMethod = Reflect.getMetadata(controller_1.DECORATOR_KEY.METHOD, prototype, methodName);
                    if (typeof controllerInstance[methodName] !== "function" || !classMethod || classMethod !== "event")
                        continue;
                    (_a = socketEvent.get(basePath)) === null || _a === void 0 ? void 0 : _a.methods.push(methodName);
                    logger.push({
                        BasePath: basePath,
                        Event: route_path,
                        ControllerName: ControllerClass.name,
                        ImplementMethod: methodName,
                        Type: "SOCKET"
                    });
                }
                yield this.registerSocketNamespace(basePath, socketEvent.get(basePath), controllerInstance, logger);
            }
            return logger;
        });
    }
    /**
     * Hands the full registered socket route list to any middleware implementing
     * the optional `setRoutes()` method, once controller/namespace registration
     * has finished and before the server starts listening.
     */
    notifyMiddlewareRoutes(routes) {
        this.middlewares.forEach((middleware) => {
            if (typeof middleware.setRoutes === "function") {
                middleware.setRoutes(routes);
            }
        });
    }
    start(port, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.adapter) {
                if (port !== undefined) {
                    throw new Error("[SocketApplication] start(port) was called but this app is attached to a shared ServerAdapter (createSocketServer({ adapter })). The adapter owns port binding and automatically starts every attached app when you call adapter.listen(port, callback) — you no longer need to call app.start() yourself, though doing so with no arguments is still harmless.");
                }
            }
            else if (port === undefined) {
                throw new Error("[SocketApplication] start(port) requires a port when no adapter is attached. Pass a port, or attach a ServerAdapter via createSocketServer({ adapter }) and call adapter.listen(port, callback) instead.");
            }
            if (this.started)
                return;
            this.started = true;
            const { SocketIO, socketOptions } = this.options;
            this.socketServer = new SocketIO(this.httpServer, Object.assign(Object.assign({}, socketOptions), (this.corsOptions !== undefined ? { cors: this.corsOptions } : {})));
            const routes = yield this.registerController(this.controllerClasses);
            this.notifyMiddlewareRoutes(routes);
            if (this.options.enableLogging)
                console.table(routes);
            if (!this.adapter) {
                this.httpServer.listen(port, callback);
            }
        });
    }
}
exports.SocketApplication = SocketApplication;
