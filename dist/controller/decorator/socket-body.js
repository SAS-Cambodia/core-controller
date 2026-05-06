"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketBody = SocketBody;
const decorator_key_1 = require("../constant/decorator-key");
function SocketBody(options) {
    return function (target, propertyKey, parameterIndex) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_BODY, parameterIndex, target, propertyKey);
        const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
        if (![String, Number, Boolean, Object, Function].includes(paramTypes[parameterIndex])) {
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.REQUEST_BODY_TYPE, paramTypes[parameterIndex], target, propertyKey);
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.REQUEST_BODY_OPTIONS, options, target, propertyKey);
        }
    };
}
