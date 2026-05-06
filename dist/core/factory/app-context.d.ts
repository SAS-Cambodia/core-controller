import { Request, Response } from 'express';
import { EmitInterceptor, SendJsonResponse } from "./index";
import { Interceptor } from "../../interface";
export default class AppContext {
    interceptor: Interceptor;
    request: Request;
    response: Response;
    startTime: Date;
    private static readonly RESPONSE;
    private static readonly REQUEST_RECEIVED;
    sendJsonResponse(body: SendJsonResponse): void;
    onEmitInterceptor(data: EmitInterceptor): void;
    start(): void;
}
