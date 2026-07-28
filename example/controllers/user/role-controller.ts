import {AccessControl, Body, Controller, Get, Post, Put, Req} from "../../../src";

import { Service } from "../../app";
import { Inject } from "../../../src";
import { UserDto } from "./dto/user-dto";


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
}


