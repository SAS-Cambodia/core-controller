import { NextFunction, Request, Response } from 'express';
import { Socket, DisconnectReason } from "socket.io";
export interface Action {
    request: Request;
    response: Response;
    next?: NextFunction;
    error?: any;
}
export type Context = Pick<Action, "request" | "response">;
export interface Interceptor {
    intercept(context: Context, content?: any): object;
}
export interface ErrorInterceptor {
    catch(context: Action): object;
}
export interface CoreMiddleware {
    use(req: Request, res: Response, next: NextFunction): void;
}
export interface SocketEventAdapter {
    onConnect(socket: Socket): void;
    onDisconnect(socket: Socket, reason: DisconnectReason): void;
    setBusinessId?(): Promise<string>;
}
