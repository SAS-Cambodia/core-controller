import { DECORATOR_KEY } from "../constant/decorator-key";

export function Param(param?: string) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		const existingParams = Reflect.getMetadata(DECORATOR_KEY.PARAM, target, propertyKey) || [];
		existingParams.push({ param, parameterIndex });
		Reflect.defineMetadata(DECORATOR_KEY.PARAM, existingParams, target, propertyKey);
	};
}
