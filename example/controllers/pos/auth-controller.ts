import { Body, Controller, Post } from "../../../src";
import { signPosToken } from "../../guards/pos-jwt";

type LoginBody = {
	storeId: string;
	plan: string;
};

// Dev-only stand-in for a real login/billing-sync endpoint: a real deployment
// verifies staff credentials, looks up the store's current plan from the
// billing provider, then mints this token — it's never resolved from
// unauthenticated client input like this.
@Controller('/auth')
export class AuthController {

	@Post('/token')
	issueToken(@Body() body: LoginBody) {
		return { token: signPosToken({ storeId: body.storeId, plan: body.plan }) };
	}
}
