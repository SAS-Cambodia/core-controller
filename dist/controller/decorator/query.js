"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = Query;
const decorator_key_1 = require("../constant/decorator-key");
function Query(queryKey) {
    return function (target, propertyKey, queryIndex) {
        const existingQuery = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.QUERY, target, propertyKey) || [];
        existingQuery.push({ queryKey, queryIndex });
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.QUERY, existingQuery, target, propertyKey);
    };
}
