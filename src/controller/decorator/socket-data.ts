import { DECORATOR_KEY } from "../constant/decorator-key";

export function SocketData(key?: string) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		Reflect.defineMetadata(DECORATOR_KEY.SOCKET_DATA, parameterIndex, target, propertyKey);
		Reflect.defineMetadata(DECORATOR_KEY.SOCKET_DATA_KEY, key, target, propertyKey);
	};
}
