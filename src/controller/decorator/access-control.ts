import { DECORATOR_KEY } from "../constant/decorator-key";

export function AccessControl(...roles: string[]) {
	return function (target: any, propertyKey?: string | symbol) {
		if (propertyKey) {
			Reflect.defineMetadata(DECORATOR_KEY.ACCESS_CONTROL, roles, target, propertyKey);
		} else {
			Reflect.defineMetadata(DECORATOR_KEY.ACCESS_CONTROL, roles, target);
		}
	};
}
