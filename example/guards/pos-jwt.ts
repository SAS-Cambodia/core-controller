import jwt from "jsonwebtoken";

// Demo only: a real deployment reads this from a secrets manager / env var
// injected at deploy time, and the token itself is minted by a real auth/
// billing service when a store's subscription is created or renewed.
const POS_JWT_SECRET = process.env.POS_JWT_SECRET || "dev-pos-secret";

export type PosTokenClaims = {
	storeId: string;
	plan: string; // e.g. 'basic' | 'pro' | 'enterprise'
};

export function signPosToken(claims: PosTokenClaims): string {
	return jwt.sign(claims, POS_JWT_SECRET, { expiresIn: "12h" });
}

// Returns null on a missing/invalid/expired token instead of throwing, so
// callers (guards, socket middleware) can treat "bad token" the same as
// "no plan" and let normal access-control denial handle it.
export function verifyPosToken(token?: string): PosTokenClaims | null {
	if (!token) return null;
	try {
		return jwt.verify(token, POS_JWT_SECRET) as PosTokenClaims;
	} catch {
		return null;
	}
}

export function extractBearerToken(authHeader?: string): string | undefined {
	return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
}
