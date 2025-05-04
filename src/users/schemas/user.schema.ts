import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Add timestamps (createdAt, updatedAt)
export class User {
  // Mongoose automatically creates _id

  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop({ required: true })
  password?: string; // Store hashed password

  // Add roles or other fields as needed
  // @Prop({ type: [String], default: ['user'] })
  // roles: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// --- Password Hashing Hook ---
// Hash password before saving a new user document
UserSchema.pre<UserDocument>('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  // Hash the password with a salt round (e.g., 10)
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- Exclude Password Method ---
// Optional: Method to exclude password when converting document to JSON
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};