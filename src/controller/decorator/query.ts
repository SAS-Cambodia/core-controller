import { DECORATOR_KEY } from "../constant/decorator-key";

export function Query(queryKey?: string) {
	return function (target: any, propertyKey: string | symbol, queryIndex: number) {
		const existingQuery = Reflect.getMetadata(DECORATOR_KEY.QUERY, target, propertyKey) || [];
		existingQuery.push({ queryKey, queryIndex });
		Reflect.defineMetadata(DECORATOR_KEY.QUERY, existingQuery, target, propertyKey);
	};
}
