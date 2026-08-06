"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerAdapter = exports.SocketApplication = exports.CoreApplication = exports.FactoryController = void 0;
const static_server_1 = require("./static-server");
Object.defineProperty(exports, "CoreApplication", { enumerable: true, get: function () { return static_server_1.CoreApplication; } });
const socket_server_1 = require("./socket-server");
Object.defineProperty(exports, "SocketApplication", { enumerable: true, get: function () { return socket_server_1.SocketApplication; } });
const server_adapter_1 = require("./server-adapter");
Object.defineProperty(exports, "ServerAdapter", { enumerable: true, get: function () { return server_adapter_1.ServerAdapter; } });
class FactoryController {
    static createServer(options) {
        return new static_server_1.CoreApplication(options);
    }
    static createSocketServer(options) {
        return new socket_server_1.SocketApplication(options);
    }
    static createAdapter() {
        return new server_adapter_1.ServerAdapter();
    }
}
exports.FactoryController = FactoryController;
