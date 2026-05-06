"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Injectable = Injectable;
const di_container_1 = require("../di-container");
const controller_1 = require("../../controller");
function Injectable(options) {
    return (target) => {
        const classMethods = Object.getOwnPropertyNames(target.prototype);
        di_container_1.container.register(target); // register dependencies injection
        // register interceptors and middleware if defined
        if (classMethods.includes('intercept') || classMethods.includes('catch')) {
            switch (options === null || options === void 0 ? void 0 : options.type) {
                case 'AFTER':
                    Reflect.defineMetadata(controller_1.DECORATOR_KEY.AFTER_INTERCEPTOR, controller_1.DECORATOR_KEY.AFTER_INTERCEPTOR, target);
                    break;
                default:
                    Reflect.defineMetadata(controller_1.DECORATOR_KEY.BEFORE_INTERCEPTOR, controller_1.DECORATOR_KEY.BEFORE_INTERCEPTOR, target);
                    break;
            }
        }
        if (classMethods.includes('use')) {
            const value = options && (options === null || options === void 0 ? void 0 : options.middlewareIndex);
            Reflect.defineMetadata(controller_1.DECORATOR_KEY.MIDDLEWARE, value, target);
        }
    };
}
