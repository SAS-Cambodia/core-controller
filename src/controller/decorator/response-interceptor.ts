import { DECORATOR_KEY } from "../constant/decorator-key";

export function ResponseInterceptor(): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(DECORATOR_KEY.RESPONSE_INTERCEPTOR, true, target);
	};
}
