"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseInterceptor = ResponseInterceptor;
const decorator_key_1 = require("../constant/decorator-key");
function ResponseInterceptor() {
    return (target) => {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.RESPONSE_INTERCEPTOR, true, target);
    };
}
