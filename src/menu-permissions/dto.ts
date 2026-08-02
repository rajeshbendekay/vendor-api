import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsString, ValidateNested } from 'class-validator';
import { UserRole } from '../users/user-role.enum';

export class MenuPermissionEntryDto {
  @IsString() menuKey: string;
  @IsEnum(UserRole) role: UserRole;
  @IsBoolean() visible: boolean;
}

export class UpdateMenuPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuPermissionEntryDto)
  entries: MenuPermissionEntryDto[];
}
