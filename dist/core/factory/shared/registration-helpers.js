"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccessControlRoles = resolveAccessControlRoles;
exports.resolvePlanRequirement = resolvePlanRequirement;
exports.hasRequiredMatch = hasRequiredMatch;
exports.requireAccessControlGuard = requireAccessControlGuard;
exports.requirePlanGuard = requirePlanGuard;
exports.resolveGuards = resolveGuards;
exports.runGuards = runGuards;
exports.instantiateController = instantiateController;
exports.registerProviders = registerProviders;
const controller_1 = require("../../../controller");
const di_1 = require("../../../di");
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
function resolveAccessControlRoles(methodRoles, classRoles) {
    return methodRoles !== undefined ? methodRoles : classRoles;
}
/**
 * Resolves the effective @RequirePlan list for a method, falling back
 * to the class-level plans when the method itself isn't annotated —
 * same fallback semantics as resolveAccessControlRoles.
 */
function resolvePlanRequirement(methodPlans, classPlans) {
    return methodPlans !== undefined ? methodPlans : classPlans;
}
/**
 * Set-membership check shared by @AccessControl and @RequirePlan: an empty
 * requirement list just means "must resolve to something", otherwise the
 * resolved list must intersect the required list.
 */
function hasRequiredMatch(required, resolved) {
    return required.length === 0
        ? resolved.length > 0
        : resolved.some((value) => required.includes(value));
}
/**
 * Returns the given AccessControlGuard or throws, since guarded routes/events
 * are only valid once useAccessControl() has been called on the owning app.
 */
function requireAccessControlGuard(guard, label) {
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
function requirePlanGuard(guard, label) {
    if (!guard) {
        throw new Error(`[RequirePlan] ${label} requires @RequirePlan but no guard was registered. Call app.usePlanAccessControl(YourGuard) before app.start().`);
    }
    return guard;
}
/**
 * Collects @UseGuards() guards from class + method level (both run, unlike
 * @AccessControl's method-overrides-class semantics) and instantiates them.
 */
function resolveGuards(prototype, ctor, methodName) {
    const classGuards = Reflect.getMetadata(controller_1.DECORATOR_KEY.GUARDS, ctor) || [];
    const methodGuards = Reflect.getMetadata(controller_1.DECORATOR_KEY.GUARDS, prototype, methodName) || [];
    return [...classGuards, ...methodGuards].map((GuardClass) => new GuardClass());
}
function runGuards(guards, context) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const guard of guards) {
            if (!(yield guard.canActivate(context)))
                return false;
        }
        return true;
    });
}
// Helper to instantiate controllers with injected providers.
function instantiateController(ControllerClass) {
    const paramTypes = Reflect.getMetadata("design:paramtypes", ControllerClass) || [];
    const dependencies = paramTypes.map(type => di_1.container.resolve(type) || null);
    return new ControllerClass(...dependencies);
}
/**
 * Registers providers into the shared DI singleton container. Idempotent
 * (DiContainer.register just overwrites the same map entry), so it's safe
 * to call from both CoreApplication.registerController and
 * SocketApplication.registerController in the same process.
 */
function registerProviders(providers) {
    if (!providers)
        return;
    for (const ProviderClass of providers) {
        di_1.container.register(ProviderClass);
    }
}
