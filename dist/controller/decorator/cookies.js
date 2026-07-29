"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cookies = Cookies;
const decorator_key_1 = require("../constant/decorator-key");
function Cookies(cookieKey) {
    return function (target, propertyKey, parameterIndex) {
        const existingCookies = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.COOKIES, target, propertyKey) || [];
        existingCookies.push({ cookieKey, cookieIndex: parameterIndex });
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.COOKIES, existingCookies, target, propertyKey);
    };
}
