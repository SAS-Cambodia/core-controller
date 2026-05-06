"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Middleware = Middleware;
const decorator_key_1 = require("../constant/decorator-key");
function Middleware(options) {
    return function (target) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.MIDDLEWARE, options, target);
    };
}
