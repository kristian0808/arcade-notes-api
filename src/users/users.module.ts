import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema'; // Import User schema

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), // Register User schema
  ],
  providers: [UsersService],
  exports: [UsersService], // Export UsersService here
})
export class UsersModule {}
