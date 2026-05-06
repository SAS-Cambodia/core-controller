"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketController = SocketController;
const decorator_key_1 = require("../constant/decorator-key");
function SocketController(basePath) {
    return function (target) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.CONTROLLER_PATH, basePath, target);
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.CONTROLLER, decorator_key_1.DECORATOR_KEY.SOCKET, target);
    };
}
