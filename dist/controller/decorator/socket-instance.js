"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketInstance = SocketInstance;
const decorator_key_1 = require("../constant/decorator-key");
function SocketInstance() {
    return function (target, propertyKey, parameterIndex) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_INSTANCE, parameterIndex, target, propertyKey);
    };
}
