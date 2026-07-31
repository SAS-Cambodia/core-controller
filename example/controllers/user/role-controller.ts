import {
	AccessControl,
	Body,
	Controller,
	Cookies,
	Get,
	Headers,
	HttpError,
	Ip,
	Post,
	Put,
	Query,
	Req,
	RequirePlan,
	UseGuards,
	BadRequestError, Injectable
} from "../../../src";

import { Service } from "../../app";
import { Inject } from "../../../src";
import { UserDto } from "./dto/user-dto";
import { ListQueryDto } from "./dto/list-query-dto";
import { RolesGuard } from "../../guards/roles-guard";

@Injectable()
class RoleService {
	get(filer: ListQueryDto) {
		return "dd"
	}
}

@Controller('/role')
export class RoleController {
	
	constructor(private readonly roleService: RoleService) {}
	
	@Inject()
	private service: Service;
	
	@Get('/test-a')
	get() {
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve("Test A")
			},3000)
		})
	}
	
	@Get('/test-b')
	async getName(@Query() query: ListQueryDto): Promise<string> {
		return "test-b"
	}
	
	@Get('/test-c')
	async getNameC(@Query() filter: ListQueryDto) {
		return this.roleService.get(filter)
	}
	
	@Post()
	create(@Body() body: UserDto) {
		return this.service.create(body);
	}
	
	@Put()
	update(@Body() body: UserDto,@Req() res: any) {
		return this.service.update(body);
	}

	@AccessControl('admin')
	@Get('/admin-only')
	adminOnly() {
		throw new BadRequestError("dd")
		return "admin content";
	}

	// @UseGuards() composes with @AccessControl: both must pass.
	@AccessControl('admin')
	@UseGuards(RolesGuard)
	@Get('/admin-only-guarded')
	adminOnlyGuarded() {
		return "admin content, guarded";
	}

	// @RequirePlan gates by the store's subscription tier, independent of
	// @AccessControl's role check — resolved from the POS auth token, see
	// PosPlanAccessControlGuard. Get one via POST /api/v1/auth/token.
	@RequirePlan('pro', 'enterprise')
	@Get('/pro-feature')
	proFeature() {
		return "pro feature content";
	}

	// @AccessControl and @RequirePlan compose: both must pass — an admin on
	// a store without an enterprise plan is still forbidden here.
	@AccessControl('admin')
	@RequirePlan('enterprise')
	@Get('/admin-enterprise-feature')
	adminEnterpriseFeature() {
		return "admin + enterprise feature content";
	}

	@Get('/whoami')
	whoami(
		@Headers('user-agent') userAgent: string,
		@Cookies('session') session: string,
		@Ip() ip: string
	) {
		return { userAgent, session, ip };
	}

	@Get('/list')
	list(@Query() query: ListQueryDto) {
		return { search: query.search, sort: query.sort };
	}

	// bodyOnly: the 40001 business code lands in the response body (via
	// GlobalErrorInterceptor's returned data), while the actual HTTP status
	// is whatever app.setDefaultErrorStatusCode() was configured to.
	@Get('/insufficient-balance')
	insufficientBalance() {
		throw new HttpError('Insufficient balance', 40001, { reason: 'low balance' }, { bodyOnly: true });
	}
}


