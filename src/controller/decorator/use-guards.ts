import { DECORATOR_KEY } from "../constant/decorator-key";
import { CanActivate } from "../../interface";

export function UseGuards(...guards: Array<new (...args: any[]) => CanActivate>) {
	return function (target: any, propertyKey?: string | symbol) {
		if (propertyKey) {
			const existingGuards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, target, propertyKey) || [];
			Reflect.defineMetadata(DECORATOR_KEY.GUARDS, [...existingGuards, ...guards], target, propertyKey);
		} else {
			const existingGuards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, target) || [];
			Reflect.defineMetadata(DECORATOR_KEY.GUARDS, [...existingGuards, ...guards], target);
		}
	};
}