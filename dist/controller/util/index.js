"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importClassesFromDirectories = importClassesFromDirectories;
exports.HttpMethod = HttpMethod;
exports.prepareController = prepareController;
exports.isInterceptor = isInterceptor;
exports.isInterceptorError = isInterceptorError;
exports.isMiddleware = isMiddleware;
exports.isSocketMiddleware = isSocketMiddleware;
exports.parseCookies = parseCookies;
exports.executeRoute = executeRoute;
const path_1 = __importDefault(require("path"));
const decorator_key_1 = require("../constant/decorator-key");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const http_error_exception_1 = require("../../http-error-exception");
/**
 * Loads all exported classes from the given directory.
 */
function importClassesFromDirectories(directories, formats = ['.js', '.ts', '.tsx']) {
    const loadFileClasses = function (exported, allLoaded) {
        if (exported instanceof Function) {
            allLoaded.push(exported);
        }
        else if (exported instanceof Array) {
            exported.forEach((i) => loadFileClasses(i, allLoaded));
        }
        else if (exported instanceof Object || typeof exported === 'object') {
            Object.keys(exported).forEach(key => loadFileClasses(exported[key], allLoaded));
        }
        return allLoaded;
    };
    const allFiles = directories.reduce((allDirs, dir) => {
        // Replace \ with / for glob
        return allDirs.concat(require('glob').sync(path_1.default.normalize(dir).replace(/\\/g, '/')));
    }, []);
    const dirs = allFiles
        .filter(file => {
        const dtsExtension = file.substring(file.length - 5, file.length);
        return formats.indexOf(path_1.default.extname(file)) !== -1 && dtsExtension !== '.d.ts';
    })
        .map(file => {
        return require(file);
    });
    return loadFileClasses(dirs, []);
}
function HttpMethod(method, path) {
    return (target, propertyKey) => {
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.METHOD, method, target, propertyKey);
        Reflect.defineMetadata(decorator_key_1.DECORATOR_KEY.ROUTE_PATH, path, target, propertyKey);
    };
}
function prepareController(controllers) {
    let controllerClasses = [];
    if (controllers && controllers.length) {
        controllerClasses = controllers.filter(controller => controller instanceof Function);
        const controllerDirs = controllers.filter(controller => typeof controller === 'string');
        controllerClasses.push(...importClassesFromDirectories(controllerDirs));
    }
    return controllerClasses;
}
function isInterceptor(obj) {
    return typeof obj.intercept === 'function';
}
function isInterceptorError(obj) {
    return typeof obj.catch === 'function';
}
function isMiddleware(obj) {
    return typeof obj.use === 'function';
}
function isSocketMiddleware(obj) {
    return typeof obj.use === 'function';
}
/**
 * Parses a raw `Cookie` header string into a key/value map.
 */
function parseCookies(header) {
    const cookies = {};
    if (!header)
        return cookies;
    header.split(';').forEach((pair) => {
        const index = pair.indexOf('=');
        if (index === -1)
            return;
        const key = pair.slice(0, index).trim();
        const value = pair.slice(index + 1).trim();
        if (key)
            cookies[key] = decodeURIComponent(value);
    });
    return cookies;
}
function executeRoute(request, response, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const method = this.controllerInstance[this.methodName];
            const paramsMeta = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.PARAM, this.controllerInstance, this.methodName) || [];
            const queryMeta = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.QUERY, this.controllerInstance, this.methodName) || [];
            const resIndex = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.RESPONSE, this.controllerInstance, this.methodName);
            const reqIndex = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.REQUEST, this.controllerInstance, this.methodName);
            const reqBodyIndex = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.REQUEST_BODY, this.controllerInstance, this.methodName);
            const reqFilesIndex = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.FILE_UPLOAD, this.controllerInstance, this.methodName);
            const headersMeta = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.HEADERS, this.controllerInstance, this.methodName) || [];
            const cookiesMeta = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.COOKIES, this.controllerInstance, this.methodName) || [];
            const ipIndex = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.IP, this.controllerInstance, this.methodName);
            const args = [];
            // Handle @Param
            for (const { param, parameterIndex, type, options } of paramsMeta) {
                if (!param && type) {
                    const instance = (0, class_transformer_1.plainToInstance)(type, request.params, options);
                    const errors = yield (0, class_validator_1.validate)(instance);
                    if (errors.length > 0) {
                        const error = new http_error_exception_1.HttpError('Validation Error', 403, errors[0]);
                        error.stack = errors[0].toString();
                        return next(error);
                    }
                    args[parameterIndex] = instance;
                }
                else {
                    args[parameterIndex] = param ? request.params[param] : request.params;
                }
            }
            // Handle @Query
            for (const { queryKey, queryIndex, type, options } of queryMeta) {
                if (!queryKey && type) {
                    const instance = (0, class_transformer_1.plainToInstance)(type, request.query, options);
                    const errors = yield (0, class_validator_1.validate)(instance);
                    if (errors.length > 0) {
                        const error = new http_error_exception_1.HttpError('Validation Error', 403, errors[0]);
                        error.stack = errors[0].toString();
                        return next(error);
                    }
                    args[queryIndex] = instance;
                }
                else {
                    args[queryIndex] = queryKey ? request.query[queryKey] : request.query;
                }
            }
            // Handle @Headers
            headersMeta.forEach(({ headerKey, headerIndex }) => {
                args[headerIndex] = headerKey ? request.headers[headerKey.toLowerCase()] : request.headers;
            });
            // Handle @Cookies
            if (cookiesMeta.length > 0) {
                const cookies = parseCookies(request.headers.cookie);
                cookiesMeta.forEach(({ cookieKey, cookieIndex }) => {
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
                const ResBodyType = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.REQUEST_BODY_TYPE, this.controllerInstance, this.methodName);
                const ResBodyTypeOptions = Reflect.getMetadata(decorator_key_1.DECORATOR_KEY.REQUEST_BODY_OPTIONS, this.controllerInstance, this.methodName);
                if (ResBodyType) {
                    const instance = (0, class_transformer_1.plainToInstance)(ResBodyType, request.body, ResBodyTypeOptions);
                    const errors = yield (0, class_validator_1.validate)(instance);
                    if (errors.length > 0) {
                        const error = new http_error_exception_1.HttpError('Validation Error', 403, errors[0]);
                        error.stack = errors[0].toString();
                        return next(error);
                    }
                    args[reqBodyIndex] = instance;
                }
                else {
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
            }
            else if (result !== undefined) {
                this.appContext.sendJsonResponse({
                    data: result,
                    request,
                    response
                });
            }
            else {
                // apply default response
                method.apply(this.controllerInstance, args);
            }
        }
        catch (err) {
            next(err);
        }
    });
}
