"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Param = Param;
const decorator_key_1 = require("../constant/decorator-key");
function Param(param) {
    return function (target, propertyKey, parameterIndex) {
        const existingParams = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.PARAM, target, propertyKey) || [];
        existingParams.push({ param, parameterIndex });
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.PARAM, existingParams, target, propertyKey);
    };
}
