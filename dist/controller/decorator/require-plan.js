"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirePlan = RequirePlan;
const decorator_key_1 = require("../constant/decorator-key");
function RequirePlan(...plans) {
    return function (target, propertyKey) {
        if (propertyKey) {
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.REQUIRE_PLAN, plans, target, propertyKey);
        }
        else {
            Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.REQUIRE_PLAN, plans, target);
        }
    };
}
