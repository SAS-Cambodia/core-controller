import { DECORATOR_KEY } from "../constant/decorator-key";

export function Cookies(cookieKey?: string) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		const existingCookies = Reflect.getMetadata(DECORATOR_KEY.COOKIES, target, propertyKey) || [];
		existingCookies.push({ cookieKey, cookieIndex: parameterIndex });
		Reflect.defineMetadata(DECORATOR_KEY.COOKIES, existingCookies, target, propertyKey);
	};
}