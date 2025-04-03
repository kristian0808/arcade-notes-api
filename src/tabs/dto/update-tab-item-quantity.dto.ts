import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateTabItemQuantityDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    quantity: number;
}