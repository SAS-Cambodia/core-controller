import { DECORATOR_KEY } from "../constant/decorator-key";

export function Middleware(options?: any) {
	return function (target: any) {
		Reflect.defineMetadata(DECORATOR_KEY.MIDDLEWARE, options, target);
	};
}