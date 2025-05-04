import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3) // Example validation: username must be at least 3 characters
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8) // Example validation: password must be at least 8 characters
  password: string;

  // Add other fields if needed for registration (e.g., email)
  // Make sure they match the User schema
}