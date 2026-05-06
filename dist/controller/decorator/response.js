"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Res = Res;
const decorator_key_1 = require("../constant/decorator-key");
function Res() {
    return function (target, propertyKey, parameterIndex) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.RESPONSE, parameterIndex, target, propertyKey);
    };
}
