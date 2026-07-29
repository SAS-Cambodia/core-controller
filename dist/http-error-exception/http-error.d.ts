export default class HttpError extends Error {
    statusCode: number;
    details: any;
    bodyOnly: boolean;
    constructor(message: string, statusCode: number, details?: any, options?: {
        bodyOnly?: boolean;
    });
}
