import { IsOptional, IsString } from 'class-validator';

export class ListQueryDto {

	@IsString()
	search: string;

	@IsOptional()
	@IsString()
	sort?: string;
}