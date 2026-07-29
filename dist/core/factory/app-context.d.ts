import { EmitInterceptor, SendJsonResponse } from "./index";
export default class AppContext {
    private readonly emitter;
    private readonly interceptorsByRequest;
    private static readonly RESPONSE;
    private static readonly REQUEST_RECEIVED;
    sendJsonResponse(body: SendJsonResponse): void;
    onEmitInterceptor(data: EmitInterceptor): void;
    start(): void;
}
