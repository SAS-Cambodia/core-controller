"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketData = SocketData;
const decorator_key_1 = require("../constant/decorator-key");
function SocketData(key) {
    return function (target, propertyKey, parameterIndex) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_DATA, parameterIndex, target, propertyKey);
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_DATA_KEY, key, target, propertyKey);
    };
}
