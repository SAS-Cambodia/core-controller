"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketResponse = SocketResponse;
const decorator_key_1 = require("../constant/decorator-key");
function SocketResponse() {
    return function (target, propertyKey, parameterIndex) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_CALLBACK, parameterIndex, target, propertyKey);
    };
}
