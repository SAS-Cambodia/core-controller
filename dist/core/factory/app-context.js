"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_bus_1 = require("./event-bus");
class AppContext {
    // Example method to send a standard JSON response
    sendJsonResponse(body) {
        event_bus_1.eventBus.emit(AppContext.RESPONSE, body);
    }
    onEmitInterceptor(data) {
        // Emit an event before processing the request
        event_bus_1.eventBus.emit(AppContext.REQUEST_RECEIVED, data);
    }
    start() {
        event_bus_1.eventBus.on(AppContext.REQUEST_RECEIVED, (data) => {
            this.request = data.request;
            this.response = data.response;
            this.interceptor = data.interceptor;
            this.startTime = data.startTime;
        });
        event_bus_1.eventBus.on(AppContext.RESPONSE, (agr) => {
            const { response, data, request, startTime } = agr;
            const body = this.interceptor ? this.interceptor.intercept({ response, request }, data) : data;
            response.status(response.statusCode).json(body);
        });
    }
}
AppContext.RESPONSE = "RESPONSE";
AppContext.REQUEST_RECEIVED = "REQUEST_RECEIVED";
exports.default = AppContext;
