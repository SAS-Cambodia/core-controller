"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Param = Param;
const decorator_key_1 = require("../constant/decorator-key");
function Param(param, options) {
    return function (target, propertyKey, parameterIndex) {
        const existingParams = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.PARAM, target, propertyKey) || [];
        const entry = { param, parameterIndex };
        if (!param) {
            const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
            const paramType = paramTypes === null || paramTypes === void 0 ? void 0 : paramTypes[parameterIndex];
            if (paramType && ![String, Number, Boolean, Object, Function].includes(paramType)) {
                entry.type = paramType;
                entry.options = options;
            }
        }
        existingParams.push(entry);
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.PARAM, existingParams, target, propertyKey);
    };
}
