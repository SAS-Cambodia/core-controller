"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayTimeoutError = exports.TooManyRequestsError = exports.UnauthorizedError = exports.ForbiddenError = exports.NotFoundError = exports.BadRequestError = exports.ConflictError = exports.InternalServerError = exports.HttpError = void 0;
const http_error_1 = __importDefault(require("./http-error"));
exports.HttpError = http_error_1.default;
const http_code_1 = require("../enums/http-code");
class BadRequestError extends http_error_1.default {
    constructor(message = "Bad Request", details) {
        super(message, http_code_1.HttpStatusCode.BAD_REQUEST, details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends http_error_1.default {
    constructor(message = "Unauthorized", details) {
        super(message, http_code_1.HttpStatusCode.UNAUTHORIZED, details);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends http_error_1.default {
    constructor(message = "Forbidden", details) {
        super(message, http_code_1.HttpStatusCode.FORBIDDEN, details);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends http_error_1.default {
    constructor(message = "Not Found", details) {
        super(message, http_code_1.HttpStatusCode.NOT_FOUND, details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends http_error_1.default {
    constructor(message = "Conflict", details) {
        super(message, http_code_1.HttpStatusCode.CONFLICT, details);
    }
}
exports.ConflictError = ConflictError;
class InternalServerError extends http_error_1.default {
    constructor(message = "Internal Server Error", details) {
        super(message, http_code_1.HttpStatusCode.INTERNAL_SERVER_ERROR, details);
    }
}
exports.InternalServerError = InternalServerError;
class TooManyRequestsError extends http_error_1.default {
    constructor(message = "Too Many Requests", details) {
        super(message, http_code_1.HttpStatusCode.TOO_MANY_REQUEST_ERROR, details);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class GatewayTimeoutError extends http_error_1.default {
    constructor(message = "Gateway Timeout", details) {
        super(message, http_code_1.HttpStatusCode.GATEWAY_TIMEOUT_ERROR, details);
    }
}
exports.GatewayTimeoutError = GatewayTimeoutError;
