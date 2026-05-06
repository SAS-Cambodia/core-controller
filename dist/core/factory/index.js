"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerFactory = void 0;
const static_server_1 = require("./static-server");
class ServerFactory {
    static createServer(options) {
        return new static_server_1.CoreApplication(options);
    }
}
exports.ServerFactory = ServerFactory;
