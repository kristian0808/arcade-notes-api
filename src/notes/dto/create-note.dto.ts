import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateNoteDto {
    @IsString()
    @IsNotEmpty()
    content: string;

    @IsOptional()
    @IsString()
    pcName?: string; 

    @IsOptional()
    @IsNumber()
    memberId?: number;

    @IsOptional()
    @IsString()
    memberAccount?: string;

}