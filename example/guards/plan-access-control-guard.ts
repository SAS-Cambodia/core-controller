import { AccessControlContext, PlanAccessControlGuard } from "../../src";
import { extractBearerToken, verifyPosToken } from "./pos-jwt";

// A POS store's subscription plan belongs to the store/merchant account, not
// the individual staff member using it — so it's resolved from the store's
// auth token rather than a per-user role. HTTP requests carry it as
// `Authorization: Bearer <token>`; sockets carry it via
// `socket.handshake.auth.token`, decoded once into `socket.data.plan` by the
// SocketAuthMiddleware registered on socketApp in app.ts (see
// socketApp.useGlobalMiddleware(SocketAuthMiddleware)) so it doesn't need
// re-verifying on every event.
export class PosPlanAccessControlGuard implements PlanAccessControlGuard {
	resolvePlans(context: AccessControlContext): string[] {
		if (context.request) {
			const token = extractBearerToken(context.request.headers.authorization);
			const claims = verifyPosToken(token);
			return claims ? [claims.plan] : [];
		}
		if (context.socket) {
			return context.socket.data.plan ? [context.socket.data.plan] : [];
		}
		return [];
	}
}
