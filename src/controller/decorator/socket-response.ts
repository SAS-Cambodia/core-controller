import { DECORATOR_KEY } from "../constant/decorator-key";

export function SocketResponse() {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		Reflect.defineMetadata(DECORATOR_KEY.SOCKET_CALLBACK, parameterIndex, target, propertyKey);
	};
}
