export default class HttpError extends Error {
	public statusCode: number;
	public details: any;
	public bodyOnly: boolean;

	constructor(message: string, statusCode: number, details?: any, options?: { bodyOnly?: boolean }) {
		super(message);
		this.statusCode = statusCode;
		this.details = details;
		this.bodyOnly = options?.bodyOnly ?? false;
		Error.captureStackTrace(this, this.constructor); // Maintain proper stack trace
	}
}