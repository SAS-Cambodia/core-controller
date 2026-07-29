"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = __importDefault(require("eventemitter3"));
class AppContext {
    constructor() {
        this.emitter = new eventemitter3_1.default();
        this.interceptorsByRequest = new WeakMap();
    }
    // Example method to send a standard JSON response
    sendJsonResponse(body) {
        this.emitter.emit(AppContext.RESPONSE, body);
    }
    onEmitInterceptor(data) {
        // Emit an event before processing the request
        this.emitter.emit(AppContext.REQUEST_RECEIVED, data);
    }
    start() {
        this.emitter.on(AppContext.REQUEST_RECEIVED, (data) => {
            var _a;
            const existing = (_a = this.interceptorsByRequest.get(data.request)) !== null && _a !== void 0 ? _a : [];
            this.interceptorsByRequest.set(data.request, [...existing, data.interceptor]);
        });
        this.emitter.on(AppContext.RESPONSE, (agr) => {
            var _a;
            const { response, data, request } = agr;
            const chain = (_a = this.interceptorsByRequest.get(request)) !== null && _a !== void 0 ? _a : [];
            this.interceptorsByRequest.delete(request);
            const body = chain.reduce((acc, interceptor) => interceptor.intercept({ response, request }, acc), data);
            response.status(response.statusCode).json(body);
        });
    }
}
AppContext.RESPONSE = "RESPONSE";
AppContext.REQUEST_RECEIVED = "REQUEST_RECEIVED";
exports.default = AppContext;
