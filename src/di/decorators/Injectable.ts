import { container } from "../di-container";
import { DECORATOR_KEY } from "../../controller";

export type Options  = {
	type?: 'BEFORE' | 'AFTER',
	middlewareIndex?: number
}

export function Injectable(options?: Options): ClassDecorator {
	return (target) => {
		const classMethods = Object.getOwnPropertyNames(target.prototype);
		container.register(target as any); // register dependencies injection
		// register interceptors and middleware if defined
		if(classMethods.includes('intercept') || classMethods.includes('catch')) {
			switch (options?.type) {
				case 'AFTER':
					Reflect.defineMetadata(DECORATOR_KEY.AFTER_INTERCEPTOR, DECORATOR_KEY.AFTER_INTERCEPTOR, target);
					break;
				default:
					Reflect.defineMetadata(DECORATOR_KEY.BEFORE_INTERCEPTOR, DECORATOR_KEY.BEFORE_INTERCEPTOR, target);
					break;
			}
		}
		
		if(classMethods.includes('use')) {
			const value = options && options?.middlewareIndex;
			Reflect.defineMetadata(DECORATOR_KEY.MIDDLEWARE, value, target);
		}
	};
}