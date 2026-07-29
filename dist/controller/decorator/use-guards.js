"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UseGuards = UseGuards;
const decorator_key_1 = require("../constant/decorator-key");
function UseGuards(...guards) {
    return function (target, propertyKey) {
        if (propertyKey) {
            const existingGuards = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.GUARDS, target, propertyKey) || [];
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.GUARDS, [...existingGuards, ...guards], target, propertyKey);
        }
        else {
            const existingGuards = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.GUARDS, target) || [];
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.GUARDS, [...existingGuards, ...guards], target);
        }
    };
}
