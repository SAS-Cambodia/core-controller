import { DECORATOR_KEY } from "../constant/decorator-key";
import { ClassTransformOptions } from "class-transformer/types/interfaces";

export function Param(param?: string, options?: ClassTransformOptions) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		const existingParams = Reflect.getMetadata(DECORATOR_KEY.PARAM, target, propertyKey) || [];
		const entry: { param?: string, parameterIndex: number, type?: any, options?: ClassTransformOptions } = { param, parameterIndex };
		if (!param) {
			const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
			const paramType = paramTypes?.[parameterIndex];
			if (paramType && ![String, Number, Boolean, Object, Function].includes(paramType)) {
				entry.type = paramType;
				entry.options = options;
			}
		}
		existingParams.push(entry);
		Reflect.defineMetadata(DECORATOR_KEY.PARAM, existingParams, target, propertyKey);
	};
}
