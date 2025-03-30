import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MemberResponseDto {
  @IsNumber()
  @IsNotEmpty()
  member_id: number;

  @IsNumber()
  @IsNotEmpty()
  member_icafe_id: number;

  @IsString()
  member_account: string;

  @IsOptional()
  @IsString()
  member_balance: string;

  @IsOptional()
  @IsString()
  member_first_name: string;

  @IsOptional()
  @IsString()
  member_last_name: string;

  member_birthday: Date | null;

  @IsOptional()
  @IsString()
  member_expire_time_local: string;

  @IsOptional()
  member_is_active: number;

  @IsOptional()
  @IsString()
  member_photo: string;

  @IsOptional()
  @IsString()
  member_email: string;

  @IsOptional()
  @IsString()
  member_telegram_username: string;

  @IsOptional()
  member_telegram_username_valid: number;

  @IsOptional()
  @IsString()
  member_phone: string;

  @IsOptional()
  @IsString()
  member_id_card: string;

  @IsOptional()
  @IsString()
  member_points: string;

  @IsOptional()
  @IsString()
  member_create: string;

  @IsOptional()
  @IsString()
  member_update: string;

  @IsOptional()
  member_group_id: number;

  @IsOptional()
  @IsString()
  member_balance_bonus: string;

  @IsOptional()
  @IsString()
  member_coin_balance: string;

  @IsOptional()
  member_sex: number;

  member_comments: string | null;

  @IsOptional()
  @IsString()
  member_address: string;

  @IsOptional()
  member_company_id: number;

  @IsOptional()
  @IsString()
  member_loan: string;

  member_recent_played: string | null;

  @IsString()
  @IsNotEmpty()
  member_id_icafe_id: string;

  @IsOptional()
  @IsString()
  member_oauth_platform: string;

  @IsOptional()
  @IsString()
  member_oauth_user_id: string;

  @IsOptional()
  @IsString()
  member_create_local: string;

  @IsOptional()
  @IsString()
  member_update_local: string;

  @IsOptional()
  member_is_expired: number;

  @IsOptional()
  member_is_logined: number;

  @IsOptional()
  offers: number;

  @IsOptional()
  member_group_discount_rate: number;

  @IsOptional()
  member_group_discount_pc_time: number;

  @IsOptional()
  member_group_discount_offer: number;

  @IsOptional()
  @IsString()
  member_group_name: string;

  @IsOptional()
  @IsString()
  left_time: string;

  @IsOptional()
  @IsBoolean()
  is_owner: boolean;

  @IsOptional()
  @IsString()
  member_center_name: string;
}

// For handling an array of members
export class MembersResponseDto {
  @Type(() => MemberResponseDto)
  members: MemberResponseDto[];
}