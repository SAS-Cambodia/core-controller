import { DECORATOR_KEY } from "../constant/decorator-key";

export function Headers(headerKey?: string) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		const existingHeaders = Reflect.getMetadata(DECORATOR_KEY.HEADERS, target, propertyKey) || [];
		existingHeaders.push({ headerKey, headerIndex: parameterIndex });
		Reflect.defineMetadata(DECORATOR_KEY.HEADERS, existingHeaders, target, propertyKey);
	};
}