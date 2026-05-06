import {ProviderTarget} from "../type";

class DiContainer {
	private static instance: DiContainer;
	private services = new Map(); // Maps classes to their implementations
	private instances = new Map(); // Maps classes to their singleton instances
	
	static getInstance(): DiContainer {
		if (!DiContainer.instance) {
			DiContainer.instance = new DiContainer();
		}
		return DiContainer.instance;
	}
	
	register<T>(target: ProviderTarget<T>): void {
		this.services.set(target, target);
	}
	
	resolve<T>(target: ProviderTarget<T>): T {
		// Check if an instance already exists
		if (this.instances.has(target)) {
			return this.instances.get(target);
		}
		
		// Resolve the class implementation
		const implementation = this.services.get(target);
		
		if (!implementation) {
			throw new Error(`Service '${target.name}' is not registered.`);
		}
		
		// Get constructor parameter types (dependencies)
		const paramTypes = Reflect.getMetadata("design:paramtypes", target) || [];
		const dependencies = paramTypes.map((dependency: any) =>
			this.resolve(dependency)
		);
	
		// Create a new instance and cache it
		const instance = new implementation(...dependencies);
		this.instances.set(target, instance);
		
		return instance;
	}
}
// Get the singleton instance of the DIContainer
export const container = DiContainer.getInstance();
