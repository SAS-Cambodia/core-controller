"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Req = Req;
const decorator_key_1 = require("../constant/decorator-key");
function Req() {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.REQUEST, parameterIndex, target, propertyKey);
    };
}
