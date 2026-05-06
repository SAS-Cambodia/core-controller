import { container } from "../di-container";

export function Inject(): PropertyDecorator {
	return (target, propertyKey) => {
		const serviceType = Reflect.getMetadata("design:type", target, propertyKey);
		if (!serviceType) {
			throw new Error(`Cannot resolve type for '${String(propertyKey)}'. Ensure the property type is explicitly defined.`);
		}
		Object.defineProperty(target, propertyKey, {
			get: () => container.resolve(serviceType),
		});
	};
}