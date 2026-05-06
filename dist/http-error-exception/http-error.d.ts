export default class HttpError extends Error {
    statusCode: number;
    details: any;
    constructor(message: string, statusCode: number, details?: any);
}
