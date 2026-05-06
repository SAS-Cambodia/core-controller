import HttpError from "./http-error";
declare class BadRequestError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class UnauthorizedError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class ForbiddenError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class NotFoundError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class ConflictError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class InternalServerError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class TooManyRequestsError extends HttpError {
    constructor(message?: string, details?: any);
}
declare class GatewayTimeoutError extends HttpError {
    constructor(message?: string, details?: any);
}
export { HttpError, InternalServerError, ConflictError, BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, TooManyRequestsError, GatewayTimeoutError };
