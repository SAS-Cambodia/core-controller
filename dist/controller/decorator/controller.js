"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = Controller;
const decorator_key_1 = require("../constant/decorator-key");
function Controller(basePath) {
    return function (target) {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.CONTROLLER_PATH, basePath, target);
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.CONTROLLER, decorator_key_1.DECORATOR_KEY.CONTROLLER, target);
    };
}
