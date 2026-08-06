import { DECORATOR_KEY } from "../constant/decorator-key";

export function RequirePlan(...plans: string[]) {
	return function (target: any, propertyKey?: string | symbol) {
		if (propertyKey) {
			Reflect.defineMetadata(DECORATOR_KEY.REQUIRE_PLAN, plans, target, propertyKey);
		} else {
			Reflect.defineMetadata(DECORATOR_KEY.REQUIRE_PLAN, plans, target);
		}
	};
}
