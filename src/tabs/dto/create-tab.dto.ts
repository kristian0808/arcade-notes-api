import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTabDto {
    @IsNumber()
    @IsNotEmpty()
    memberId: number;

    @IsString()
    @IsNotEmpty()
    memberAccount: string;

    @IsString()
    @IsOptional()
    pcName?: string;
}