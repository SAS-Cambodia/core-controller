import { DECORATOR_KEY } from "../constant/decorator-key";

export function SocketInstance() {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		Reflect.defineMetadata(DECORATOR_KEY.SOCKET_INSTANCE, parameterIndex, target, propertyKey);
	};
}
