"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ip = Ip;
const decorator_key_1 = require("../constant/decorator-key");
function Ip() {
    return function (target, propertyKey, parameterIndex) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.IP, parameterIndex, target, propertyKey);
    };
}
