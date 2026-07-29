import { AccessControlContext, CanActivate } from "../../src";

// Demo only: a general-purpose guard independent of @AccessControl, e.g. for
// checks that aren't role-based (feature flags, ownership checks, etc).
export class RolesGuard implements CanActivate {
	canActivate(context: AccessControlContext): boolean {
		if (context.request) {
			return context.request.headers['x-role'] === 'admin';
		}
		if (context.socket) {
			return context.socket.data.role === 'admin';
		}
		return false;
	}
}