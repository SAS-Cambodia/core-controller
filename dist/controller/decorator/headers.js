"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Headers = Headers;
const decorator_key_1 = require("../constant/decorator-key");
function Headers(headerKey) {
    return function (target, propertyKey, parameterIndex) {
        const existingHeaders = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.HEADERS, target, propertyKey) || [];
        existingHeaders.push({ headerKey, headerIndex: parameterIndex });
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.HEADERS, existingHeaders, target, propertyKey);
    };
}
