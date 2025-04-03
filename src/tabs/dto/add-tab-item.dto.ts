import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AddTabItemDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsNotEmpty()
    productName: string;

    @IsNumber()
    @IsNotEmpty()
    price: number;

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    quantity: number;
}