"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class HttpError extends Error {
    constructor(message, statusCode, details, options) {
        var _a;
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.bodyOnly = (_a = options === null || options === void 0 ? void 0 : options.bodyOnly) !== null && _a !== void 0 ? _a : false;
        Error.captureStackTrace(this, this.constructor); // Maintain proper stack trace
    }
}
exports.default = HttpError;
