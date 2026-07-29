"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = Query;
const decorator_key_1 = require("../constant/decorator-key");
function Query(queryKey, options) {
    return function (target, propertyKey, queryIndex) {
        const existingQuery = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.QUERY, target, propertyKey) || [];
        const entry = { queryKey, queryIndex };
        if (!queryKey) {
            const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
            const paramType = paramTypes === null || paramTypes === void 0 ? void 0 : paramTypes[queryIndex];
            if (paramType && ![String, Number, Boolean, Object, Function].includes(paramType)) {
                entry.type = paramType;
                entry.options = options;
            }
        }
        existingQuery.push(entry);
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.QUERY, existingQuery, target, propertyKey);
    };
}
