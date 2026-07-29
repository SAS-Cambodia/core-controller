import { DECORATOR_KEY } from "../constant/decorator-key";

export function SocketQuery(queryKey?: string) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		const existingQuery = Reflect.getMetadata(DECORATOR_KEY.SOCKET_QUERY, target, propertyKey) || [];
		existingQuery.push({ queryKey, queryIndex: parameterIndex });
		Reflect.defineMetadata(DECORATOR_KEY.SOCKET_QUERY, existingQuery, target, propertyKey);
	};
}