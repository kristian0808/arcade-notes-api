import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto'; // We'll create this DTO next

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /**
   * Finds a user by their username.
   * Includes the password field as it's needed for validation.
   */
  async findOne(username: string): Promise<UserDocument | undefined> {
    // Use .select('+password') to explicitly include the password field
    // if it's excluded by default in the schema (which it isn't here, but good practice)
    return this.userModel.findOne({ username }).select('+password').exec();
  }

  /**
   * Creates a new user (registration).
   * The password will be automatically hashed by the pre-save hook in the schema.
   */
  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { username } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ username }).exec();
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
    // Note: The .toJSON() method in the schema might exclude the password here if called implicitly.
    // If you need the full document including the hash temporarily, avoid implicit toJSON calls.
  }

  // Add methods for updating, deleting users as needed
}
