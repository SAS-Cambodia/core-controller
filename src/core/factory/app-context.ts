import { Request, Response } from 'express';
import { eventBus } from "./event-bus";
import { EmitInterceptor, SendJsonResponse } from "./index";
import { Interceptor } from "../../interface";

export default class AppContext {
    
    public interceptor: Interceptor;
	public request: Request;
	public response: Response;
	public startTime: Date;
	
	private static readonly RESPONSE = "RESPONSE";
	private static readonly REQUEST_RECEIVED = "REQUEST_RECEIVED";
    
    // Example method to send a standard JSON response
    sendJsonResponse(body: SendJsonResponse) {
        eventBus.emit(AppContext.RESPONSE, body);
    }
    
    onEmitInterceptor(data: EmitInterceptor){
        // Emit an event before processing the request
        eventBus.emit(AppContext.REQUEST_RECEIVED, data);
    }
	
    start(){
        eventBus.on(AppContext.REQUEST_RECEIVED, (data: EmitInterceptor) => {
            this.request = data.request;
            this.response = data.response;
            this.interceptor = data.interceptor;
			this.startTime = data.startTime
        });
        
        eventBus.on(AppContext.RESPONSE, (agr: SendJsonResponse) => {
            const { response ,data,request,startTime} = agr;
            const body = this.interceptor ? this.interceptor.intercept({response, request},data) : data;
            response.status(response.statusCode).json(body);
        });
    }
    
}