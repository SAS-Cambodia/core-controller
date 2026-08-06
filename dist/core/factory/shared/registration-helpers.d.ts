import { AccessControlContext, AccessControlGuard, CanActivate, PlanAccessControlGuard } from "../../../interface";
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
export declare function resolveAccessControlRoles(methodRoles?: string[], classRoles?: string[]): string[] | undefined;
/**
 * Resolves the effective @RequirePlan list for a method, falling back
 * to the class-level plans when the method itself isn't annotated —
 * same fallback semantics as resolveAccessControlRoles.
 */
export declare function resolvePlanRequirement(methodPlans?: string[], classPlans?: string[]): string[] | undefined;
/**
 * Set-membership check shared by @AccessControl and @RequirePlan: an empty
 * requirement list just means "must resolve to something", otherwise the
 * resolved list must intersect the required list.
 */
export declare function hasRequiredMatch(required: string[], resolved: string[]): boolean;
/**
 * Returns the given AccessControlGuard or throws, since guarded routes/events
 * are only valid once useAccessControl() has been called on the owning app.
 */
export declare function requireAccessControlGuard(guard: AccessControlGuard | undefined, label: string): AccessControlGuard;
/**
 * Returns the given PlanAccessControlGuard or throws, since @RequirePlan-guarded
 * routes/events are only valid once usePlanAccessControl() has been called on
 * the owning app.
 */
export declare function requirePlanGuard(guard: PlanAccessControlGuard | undefined, label: string): PlanAccessControlGuard;
/**
 * Collects @UseGuards() guards from class + method level (both run, unlike
 * @AccessControl's method-overrides-class semantics) and instantiates them.
 */
export declare function resolveGuards(prototype: any, ctor: any, methodName: string): CanActivate[];
export declare function runGuards(guards: CanActivate[], context: AccessControlContext): Promise<boolean>;
export declare function instantiateController(ControllerClass: any): any;
/**
 * Registers providers into the shared DI singleton container. Idempotent
 * (DiContainer.register just overwrites the same map entry), so it's safe
 * to call from both CoreApplication.registerController and
 * SocketApplication.registerController in the same process.
 */
export declare function registerProviders(providers: Function[] | undefined): void;
