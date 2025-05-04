import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service'; // Adjust path if needed
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeedingService implements OnModuleInit {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * This method is automatically called by NestJS when the module is initialized.
   */
  async onModuleInit() {
    this.logger.log('Starting database seeding...');
    await this.seedAdminUser();
    this.logger.log('Database seeding finished.');
  }

  /**
   * Checks if an initial admin user exists and creates one if not.
   * Reads credentials from environment variables:
   * - INITIAL_ADMIN_USERNAME (defaults to 'admin')
   * - INITIAL_ADMIN_PASSWORD
   */
  private async seedAdminUser() {
    const adminUsername = this.configService.get<string>('INITIAL_ADMIN_USERNAME', 'admin'); // Default to 'admin'
    const adminPassword = this.configService.get<string>('INITIAL_ADMIN_PASSWORD');

    if (!adminPassword) {
      this.logger.warn(
        'INITIAL_ADMIN_PASSWORD not set in environment variables. Skipping initial admin user seeding.',
      );
      return;
    }

    try {
      const existingAdmin = await this.usersService.findOne(adminUsername);
      if (!existingAdmin) {
        this.logger.log(`Initial admin user "${adminUsername}" not found. Creating...`);
        await this.usersService.create({ username: adminUsername, password: adminPassword });
        this.logger.log(`Initial admin user "${adminUsername}" created successfully.`);
      } else {
        this.logger.log(`Initial admin user "${adminUsername}" already exists.`);
      }
    } catch (error) {
      this.logger.error('Error seeding initial admin user:', error);
    }
  }
}
