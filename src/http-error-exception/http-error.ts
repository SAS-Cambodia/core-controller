export default class HttpError extends Error {
	public statusCode: number;
	public details: any;
	
	constructor(message: string, statusCode: number,details?: any) {
		super(message);
		this.statusCode = statusCode;
		this.details = details;
		Error.captureStackTrace(this, this.constructor); // Maintain proper stack trace
	}
}
