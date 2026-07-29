import { DECORATOR_KEY } from "../constant/decorator-key";

export function Ip() {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		Reflect.defineMetadata(DECORATOR_KEY.IP, parameterIndex, target, propertyKey);
	};
}