import {Request} from 'express';
import EventEmitter from "eventemitter3";
import {EmitInterceptor, SendJsonResponse} from "./index";
import {Interceptor} from "../../interface";

export default class AppContext {

	private readonly emitter = new EventEmitter();
	private readonly interceptorsByRequest = new WeakMap<Request, Interceptor[]>();

	private static readonly RESPONSE = "RESPONSE";
	private static readonly REQUEST_RECEIVED = "REQUEST_RECEIVED";

	// Example method to send a standard JSON response
	sendJsonResponse(body: SendJsonResponse) {
		this.emitter.emit(AppContext.RESPONSE, body);
	}

	onEmitInterceptor(data: EmitInterceptor) {
		// Emit an event before processing the request
		this.emitter.emit(AppContext.REQUEST_RECEIVED, data);
	}

	start() {
		this.emitter.on(AppContext.REQUEST_RECEIVED, (data: EmitInterceptor) => {
			const existing = this.interceptorsByRequest.get(data.request) ?? [];
			this.interceptorsByRequest.set(data.request, [...existing, data.interceptor]);
		});

		this.emitter.on(AppContext.RESPONSE, (agr: SendJsonResponse) => {
			const {response, data, request} = agr;
			const chain = this.interceptorsByRequest.get(request) ?? [];
			this.interceptorsByRequest.delete(request);
			const body = chain.reduce((acc, interceptor) => interceptor.intercept({response, request}, acc), data);
			response.status(response.statusCode).json(body);
		});
	}

}
