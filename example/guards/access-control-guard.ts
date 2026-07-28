import { AccessControlContext, AccessControlGuard } from "../../src";

// Demo only: reads a role from a header (HTTP) or socket.data (socket),
// standing in for real auth (JWT/session) a consumer would implement here.
export class DemoAccessControlGuard implements AccessControlGuard {
	resolveRoles(context: AccessControlContext): string[] {
		if (context.request) {
			const role = context.request.headers['x-role'];
			return role ? [String(role)] : [];
		}
		if (context.socket) {
			return context.socket.data.role ? [context.socket.data.role] : [];
		}
		return [];
	}
}
