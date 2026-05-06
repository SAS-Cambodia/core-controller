import { DECORATOR_KEY } from "../constant/decorator-key";

export function Res() {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		Reflect.defineMetadata(DECORATOR_KEY.RESPONSE, parameterIndex, target, propertyKey);
	};
}
