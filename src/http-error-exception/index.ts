import HttpError from "./http-error";
import { HttpStatusCode } from "../enums/http-code";

class BadRequestError extends HttpError {
	constructor(message = "Bad Request", details?: any) {
		super(message, HttpStatusCode.BAD_REQUEST, details);
	}
}

class UnauthorizedError extends HttpError {
	constructor(message = "Unauthorized", details?: any) {
		super(message, HttpStatusCode.UNAUTHORIZED, details);
	}
}

class ForbiddenError extends HttpError {
	constructor(message = "Forbidden", details?: any) {
		super(message, HttpStatusCode.FORBIDDEN, details);
	}
}

class NotFoundError extends HttpError {
	constructor(message = "Not Found", details?: any) {
		super(message, HttpStatusCode.NOT_FOUND, details);
	}
}

class ConflictError extends HttpError {
	constructor(message = "Conflict", details?: any) {
		super(message, HttpStatusCode.CONFLICT, details);
	}
}

class InternalServerError extends HttpError {
	constructor(message = "Internal Server Error", details?: any) {
		super(message, HttpStatusCode.INTERNAL_SERVER_ERROR, details);
	}
}

class TooManyRequestsError extends HttpError {
	constructor(message = "Too Many Requests", details?: any) {
		super(message, HttpStatusCode.TOO_MANY_REQUEST_ERROR, details);
	}
}

class GatewayTimeoutError extends HttpError {
	constructor(message = "Gateway Timeout", details?: any) {
		super(message, HttpStatusCode.GATEWAY_TIMEOUT_ERROR, details);
	}
}

export {
	HttpError,
	InternalServerError,
	ConflictError,
	BadRequestError,
	NotFoundError,
	ForbiddenError,
	UnauthorizedError,
	TooManyRequestsError,
	GatewayTimeoutError
}