import {IsBoolean, IsOptional, IsString} from 'class-validator';
import {Transform} from 'class-transformer'


export class ListQueryDto {
	
	@IsOptional()
	@IsString()
	search: string;

	@IsOptional()
	@IsString()
	sort?: string;
	
	// @IsOptional()
	// @IsBoolean()
	@Transform((value) => {
		console.log({value})
		if(!value) return false
		return value;
	} )
	isPaginated: boolean;
}
