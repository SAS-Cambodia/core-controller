import {AccessControl, Body, Controller, Cookies, Get, Headers, Ip, Post, Put, Query, Req, UseGuards} from "../../../src";

import { Service } from "../../app";
import { Inject } from "../../../src";
import { UserDto } from "./dto/user-dto";
import { ListQueryDto } from "./dto/list-query-dto";
import { RolesGuard } from "../../guards/roles-guard";


@Controller('/role')
export class RoleController {
	
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
	async getName() {
		return "test-b"
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
		return "admin content";
	}

	// @UseGuards() composes with @AccessControl: both must pass.
	@AccessControl('admin')
	@UseGuards(RolesGuard)
	@Get('/admin-only-guarded')
	adminOnlyGuarded() {
		return "admin content, guarded";
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
}


