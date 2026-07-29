"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketQuery = SocketQuery;
const decorator_key_1 = require("../constant/decorator-key");
function SocketQuery(queryKey) {
    return function (target, propertyKey, parameterIndex) {
        const existingQuery = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_QUERY, target, propertyKey) || [];
        existingQuery.push({ queryKey, queryIndex: parameterIndex });
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.SOCKET_QUERY, existingQuery, target, propertyKey);
    };
}
