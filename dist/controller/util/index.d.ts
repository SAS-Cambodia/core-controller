import { CoreMiddleware, ErrorInterceptor, Interceptor } from "../../interface";
import { NextFunction, Request, Response } from "express";
type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'event';
/**
 * Loads all exported classes from the given directory.
 */
export declare function importClassesFromDirectories(directories: string[], formats?: string[]): Function[];
export declare function HttpMethod(method: HttpMethod, path?: string): MethodDecorator;
export declare function prepareController(controllers: Function[] | string[]): Function[];
export declare function isInterceptor(obj: Interceptor): obj is Interceptor;
export declare function isInterceptorError(obj: ErrorInterceptor): obj is ErrorInterceptor;
export declare function isMiddleware(obj: CoreMiddleware): obj is CoreMiddleware;
export declare function executeRoute(this: any, request: Request, response: Response, next: NextFunction): Promise<void>;
export {};
