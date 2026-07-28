"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessControl = AccessControl;
const decorator_key_1 = require("../constant/decorator-key");
function AccessControl(...roles) {
    return function (target, propertyKey) {
        if (propertyKey) {
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.ACCESS_CONTROL, roles, target, propertyKey);
        }
        else {
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.ACCESS_CONTROL, roles, target);
        }
    };
}
