import path from 'path';
import {DECORATOR_KEY} from "../constant/decorator-key";
import {CoreMiddleware, CoreSocketMiddleware, ErrorInterceptor, Interceptor} from "../../interface";
import {NextFunction, Request, Response} from "express";
import {plainToInstance} from "class-transformer";
import {validate} from "class-validator";
import {HttpError} from "../../http-error-exception";

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'event';

/**
 * Loads all exported classes from the given directory.
 */
export function importClassesFromDirectories(directories: string[], formats = ['.js', '.ts', '.tsx']): Function[] {
	const loadFileClasses = function (exported: any, allLoaded: Function[]) {
		if (exported instanceof Function) {
			allLoaded.push(exported);
		} else if (exported instanceof Array) {
			exported.forEach((i: any) => loadFileClasses(i, allLoaded));
		} else if (exported instanceof Object || typeof exported === 'object') {
			Object.keys(exported).forEach(key => loadFileClasses(exported[key], allLoaded));
		}
		
		return allLoaded;
	};
	
	const allFiles = directories.reduce((allDirs, dir) => {
		// Replace \ with / for glob
		return allDirs.concat(require('glob').sync(path.normalize(dir).replace(/\\/g, '/')));
	}, [] as string[]);
	
	const dirs = allFiles
	.filter(file => {
		const dtsExtension = file.substring(file.length - 5, file.length);
		return formats.indexOf(path.extname(file)) !== -1 && dtsExtension !== '.d.ts';
	})
	.map(file => {
		return require(file);
	});
	
	return loadFileClasses(dirs, []);
}

export function HttpMethod(method: HttpMethod, path?: string): MethodDecorator {
	return (target, propertyKey) => {
		Reflect.defineMetadata(DECORATOR_KEY.METHOD, method, target, propertyKey);
		Reflect.defineMetadata(DECORATOR_KEY.ROUTE_PATH, path, target, propertyKey);
	};
}

export function prepareController(controllers: Function[] | string[]) {
	let controllerClasses: Function[] = [];
	if (controllers && controllers.length) {
		controllerClasses = (controllers as any[]).filter(controller => controller instanceof Function);
		const controllerDirs = (controllers as any[]).filter(controller => typeof controller === 'string');
		controllerClasses.push(...importClassesFromDirectories(controllerDirs));
	}
	return controllerClasses;
}

export function isInterceptor(obj: Interceptor): obj is Interceptor {
	return typeof obj.intercept === 'function';
}

export function isInterceptorError(obj: ErrorInterceptor): obj is ErrorInterceptor {
	return typeof obj.catch === 'function';
}

export function isMiddleware(obj: CoreMiddleware): obj is CoreMiddleware {
	return typeof obj.use === 'function';
}

export function isSocketMiddleware(obj: CoreSocketMiddleware): obj is CoreSocketMiddleware {
	return typeof obj.use === 'function';
}

/**
 * Parses a raw `Cookie` header string into a key/value map.
 */
export function parseCookies(header?: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!header) return cookies;
	header.split(';').forEach((pair) => {
		const index = pair.indexOf('=');
		if (index === -1) return;
		const key = pair.slice(0, index).trim();
		const value = pair.slice(index + 1).trim();
		if (key) cookies[key] = decodeURIComponent(value);
	});
	return cookies;
}

export async function executeRoute(this: any, request: Request, response: Response, next: NextFunction) {
	try {
		
		const method = this.controllerInstance[this.methodName];
		const paramsMeta = Reflect.getMetadata(DECORATOR_KEY.PARAM, this.controllerInstance, this.methodName) || [];
		const queryMeta = Reflect.getMetadata(DECORATOR_KEY.QUERY, this.controllerInstance, this.methodName) || [];
		const resIndex = Reflect.getMetadata(DECORATOR_KEY.RESPONSE, this.controllerInstance, this.methodName);
		const reqIndex = Reflect.getMetadata(DECORATOR_KEY.REQUEST, this.controllerInstance, this.methodName);
		const reqBodyIndex = Reflect.getMetadata(DECORATOR_KEY.REQUEST_BODY, this.controllerInstance, this.methodName);
		const reqFilesIndex = Reflect.getMetadata(DECORATOR_KEY.FILE_UPLOAD, this.controllerInstance, this.methodName);
		const headersMeta = Reflect.getMetadata(DECORATOR_KEY.HEADERS, this.controllerInstance, this.methodName) || [];
		const cookiesMeta = Reflect.getMetadata(DECORATOR_KEY.COOKIES, this.controllerInstance, this.methodName) || [];
		const ipIndex = Reflect.getMetadata(DECORATOR_KEY.IP, this.controllerInstance, this.methodName);
		const args: any[] = [];

		// Handle @Param
		for (const {param, parameterIndex, type, options} of paramsMeta as { param?: string, parameterIndex: number, type?: new (...args: any[]) => object, options?: any }[]) {
			if (!param && type) {
				const instance = plainToInstance(type, request.params, options);
				const errors = await validate(instance);
				if (errors.length > 0) {
					const error = new HttpError('Validation Error', 403, errors[0]);
					error.stack = errors[0].toString();
					return next(error);
				}
				args[parameterIndex] = instance;
			} else {
				args[parameterIndex] = param ? request.params[param] : request.params;
			}
		}

		// Handle @Query
		for (const {queryKey, queryIndex, type, options} of queryMeta as { queryKey?: string, queryIndex: number, type?: new (...args: any[]) => object, options?: any }[]) {
			if (!queryKey && type) {
				const instance = plainToInstance(type, request.query, options);
				const errors = await validate(instance);
				if (errors.length > 0) {
					const error = new HttpError('Validation Error', 403, errors[0]);
					error.stack = errors[0].toString();
					return next(error);
				}
				args[queryIndex] = instance;
			} else {
				args[queryIndex] = queryKey ? request.query[queryKey] : request.query;
			}
		}

		// Handle @Headers
		headersMeta.forEach(({headerKey, headerIndex}: { headerKey?: string, headerIndex: number }) => {
			args[headerIndex] = headerKey ? request.headers[headerKey.toLowerCase()] : request.headers;
		});

		// Handle @Cookies
		if (cookiesMeta.length > 0) {
			const cookies = parseCookies(request.headers.cookie);
			cookiesMeta.forEach(({cookieKey, cookieIndex}: { cookieKey?: string, cookieIndex: number }) => {
				args[cookieIndex] = cookieKey ? cookies[cookieKey] : cookies;
			});
		}

		// Handle @Ip
		if (ipIndex !== undefined) {
			args[ipIndex] = request.ip;
		}

		// Handle @Res
		if (resIndex !== undefined) {
			args[resIndex] = response;
		}
		
		// Handle @Request
		if (reqIndex !== undefined) {
			args[reqIndex] = request;
		}
		
		if (reqFilesIndex) {
			switch (reqFilesIndex.options.type) {
				case 'single':
					args[reqFilesIndex.parameterIndex] = request.file;
					break;
				default:
					args[reqFilesIndex.parameterIndex] = request.files;
					break;
			}
		}
		
		// Handle @Body
		if (reqBodyIndex !== undefined) {
			const ResBodyType = Reflect.getMetadata(DECORATOR_KEY.REQUEST_BODY_TYPE, this.controllerInstance, this.methodName);
			const ResBodyTypeOptions = Reflect.getMetadata(DECORATOR_KEY.REQUEST_BODY_OPTIONS, this.controllerInstance, this.methodName);
			
			if (ResBodyType) {
				const instance = plainToInstance(ResBodyType, request.body, ResBodyTypeOptions);
				const errors = await validate(instance);
				if (errors.length > 0) {
					const error = new HttpError('Validation Error', 403, errors[0]);
					error.stack = errors[0].toString();
					return next(error);
				}
				args[reqBodyIndex] = instance;
			} else {
				args[reqBodyIndex] = request.body;
			}
		}
		
		const result = this.controllerInstance[this.methodName](...args);
		
		// check method is promise
		if (result instanceof Promise) {
			result.then((data) => {
				this.appContext.sendJsonResponse({
					data,
					request,
					response
				});
			}).catch(next);
		} else if (result !== undefined) {
			this.appContext.sendJsonResponse({
				data: result,
				request,
				response
			});
		} else {
			// apply default response
			method.apply(this.controllerInstance, args);
		}
		
	} catch (err) {
		next(err);
	}
}
