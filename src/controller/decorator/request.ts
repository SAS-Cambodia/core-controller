import { DECORATOR_KEY } from "../constant/decorator-key";

export function Req() {
	return (target: any, propertyKey: string, parameterIndex: number) => {
		Reflect.defineMetadata(DECORATOR_KEY.REQUEST, parameterIndex, target, propertyKey);
	};
}
