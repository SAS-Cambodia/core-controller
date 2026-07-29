import { DECORATOR_KEY } from "../constant/decorator-key";
import { ClassTransformOptions } from "class-transformer/types/interfaces";

export function Query(queryKey?: string, options?: ClassTransformOptions) {
	return function (target: any, propertyKey: string | symbol, queryIndex: number) {
		const existingQuery = Reflect.getMetadata(DECORATOR_KEY.QUERY, target, propertyKey) || [];
		const entry: { queryKey?: string, queryIndex: number, type?: any, options?: ClassTransformOptions } = { queryKey, queryIndex };
		if (!queryKey) {
			const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
			const paramType = paramTypes?.[queryIndex];
			if (paramType && ![String, Number, Boolean, Object, Function].includes(paramType)) {
				entry.type = paramType;
				entry.options = options;
			}
		}
		existingQuery.push(entry);
		Reflect.defineMetadata(DECORATOR_KEY.QUERY, existingQuery, target, propertyKey);
	};
}
