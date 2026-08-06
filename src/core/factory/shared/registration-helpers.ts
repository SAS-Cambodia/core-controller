import { DECORATOR_KEY } from "../../../controller";
import { AccessControlContext, AccessControlGuard, CanActivate, PlanAccessControlGuard } from "../../../interface";
import { container } from "../../../di";

/**
 * Protocol-agnostic registration/guard helpers shared by CoreApplication
 * (HTTP) and SocketApplication (Socket.IO) — both run the same
 * @AccessControl/@RequirePlan/@UseGuards checks during controller
 * registration and request/event dispatch, just wrapped in different
 * transport-specific middleware.
 */

/**
 * Resolves the effective @AccessControl role list for a method, falling back
 * to the class-level roles when the method itself isn't annotated.
 */
export function resolveAccessControlRoles(methodRoles?: string[], classRoles?: string[]): string[] | undefined {
	return methodRoles !== undefined ? methodRoles : classRoles;
}

/**
 * Resolves the effective @RequirePlan list for a method, falling back
 * to the class-level plans when the method itself isn't annotated —
 * same fallback semantics as resolveAccessControlRoles.
 */
export function resolvePlanRequirement(methodPlans?: string[], classPlans?: string[]): string[] | undefined {
	return methodPlans !== undefined ? methodPlans : classPlans;
}

/**
 * Set-membership check shared by @AccessControl and @RequirePlan: an empty
 * requirement list just means "must resolve to something", otherwise the
 * resolved list must intersect the required list.
 */
export function hasRequiredMatch(required: string[], resolved: string[]): boolean {
	return required.length === 0
		? resolved.length > 0
		: resolved.some((value) => required.includes(value));
}

/**
 * Returns the given AccessControlGuard or throws, since guarded routes/events
 * are only valid once useAccessControl() has been called on the owning app.
 */
export function requireAccessControlGuard(guard: AccessControlGuard | undefined, label: string): AccessControlGuard {
	if (!guard) {
		throw new Error(`[AccessControl] ${label} requires @AccessControl but no guard was registered. Call app.useAccessControl(YourGuard) before app.start().`);
	}
	return guard;
}

/**
 * Returns the given PlanAccessControlGuard or throws, since @RequirePlan-guarded
 * routes/events are only valid once usePlanAccessControl() has been called on
 * the owning app.
 */
export function requirePlanGuard(guard: PlanAccessControlGuard | undefined, label: string): PlanAccessControlGuard {
	if (!guard) {
		throw new Error(`[RequirePlan] ${label} requires @RequirePlan but no guard was registered. Call app.usePlanAccessControl(YourGuard) before app.start().`);
	}
	return guard;
}

/**
 * Collects @UseGuards() guards from class + method level (both run, unlike
 * @AccessControl's method-overrides-class semantics) and instantiates them.
 */
export function resolveGuards(prototype: any, ctor: any, methodName: string): CanActivate[] {
	const classGuards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, ctor) || [];
	const methodGuards = Reflect.getMetadata(DECORATOR_KEY.GUARDS, prototype, methodName) || [];
	return [...classGuards, ...methodGuards].map((GuardClass: any) => new GuardClass());
}

export async function runGuards(guards: CanActivate[], context: AccessControlContext): Promise<boolean> {
	for (const guard of guards) {
		if (!(await guard.canActivate(context))) return false;
	}
	return true;
}

// Helper to instantiate controllers with injected providers.
export function instantiateController(ControllerClass: any) {
	const paramTypes: any[] = Reflect.getMetadata("design:paramtypes", ControllerClass) || [];
	const dependencies = paramTypes.map(type => container.resolve(type) || null);
	return new ControllerClass(...dependencies);
}

/**
 * Registers providers into the shared DI singleton container. Idempotent
 * (DiContainer.register just overwrites the same map entry), so it's safe
 * to call from both CoreApplication.registerController and
 * SocketApplication.registerController in the same process.
 */
export function registerProviders(providers: Function[] | undefined): void {
	if (!providers) return;
	for (const ProviderClass of providers) {
		container.register(ProviderClass as any);
	}
}