"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUpload = FileUpload;
const decorator_key_1 = require("../constant/decorator-key");
function FileUpload(options) {
    return (target, propertyKey, parameterIndex) => {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.FILE_UPLOAD, {
            parameterIndex,
            options
        }, target, propertyKey);
    };
}
