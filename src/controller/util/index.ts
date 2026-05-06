import path from 'path';
import { DECORATOR_KEY } from "../constant/decorator-key";
import { CoreMiddleware, ErrorInterceptor, Interceptor } from "../../interface";
import { NextFunction, Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { HttpError } from "../../http-error-exception";

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

export async function executeRoute(this: any, request: Request, response: Response, next: NextFunction) {
	try {
		
		const method = this.controllerInstance[this.methodName];
		const paramsMeta = Reflect.getMetadata(DECORATOR_KEY.PARAM, this.controllerInstance, this.methodName) || [];
		const queryMeta = Reflect.getMetadata(DECORATOR_KEY.QUERY, this.controllerInstance, this.methodName) || [];
		const resIndex = Reflect.getMetadata(DECORATOR_KEY.RESPONSE, this.controllerInstance, this.methodName);
		const reqIndex = Reflect.getMetadata(DECORATOR_KEY.REQUEST, this.controllerInstance, this.methodName);
		const reqBodyIndex = Reflect.getMetadata(DECORATOR_KEY.REQUEST_BODY, this.controllerInstance, this.methodName);
		const reqFilesIndex = Reflect.getMetadata(DECORATOR_KEY.FILE_UPLOAD, this.controllerInstance, this.methodName);
		const args: any[] = [];
		
		// Handle @Param
		paramsMeta.forEach(({param, parameterIndex}: { param: string, parameterIndex: number }) => {
			args[parameterIndex] = param ? request.params[param] : request.params;
		});
		
		// Handle @Query
		queryMeta.forEach(({queryKey, queryIndex}: { queryKey: string, queryIndex: number }) => {
			args[queryIndex] = queryKey ? request.query[queryKey] : request.query;
		});
		
		// Handle @Res
		if (resIndex !== undefined) {
			args[resIndex] = response;
		}
		
		// Handle @Request
		if (reqIndex !== undefined) {
			args[reqIndex] = request;
		}
		
		if(reqFilesIndex) {
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
			
			if (ResBodyType) {
				const instance = plainToInstance(ResBodyType, request.body);
				const errors = await validate(instance);
				if (errors.length > 0) {
					const error = new HttpError('Validation Error', 403, errors[0]);
					error.stack = errors[0].toString();
					return next(error);
				}
			}
			
			args[reqBodyIndex] = request.body;
		}
		
		const result = this.controllerInstance[this.methodName](...args);
		
		// check method is promise
		if (result instanceof Promise) {
			result.then((data) => {
				this.appContext.sendJsonResponse({
					data,
                    status: response.statusCode,
					request,
					response
				});
			}).catch(next);
		} else if (result !== undefined) {
			this.appContext.sendJsonResponse({
				data: result,
				status: response.statusCode,
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
