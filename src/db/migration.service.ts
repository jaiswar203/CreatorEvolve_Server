import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@/common/config/services/config.service';
import * as migrateMongo from 'migrate-mongo';

@Injectable()
export class MigrationService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const config = {
      mongodb: {
        url: this.configService.get<string>('DATABASE_URL'),
        databaseName: this.configService.get<string>('NODE_ENV'),
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        },
      },
      migrationsDir: 'src/db/migrations',
      changelogCollectionName: 'changelog',
    };

    // Set configuration for migrate-mongo
    migrateMongo.config.set(config);

    try {
      // Connect to the database
      const { db, client } = await migrateMongo.database.connect();
      // Run the migrations
      const migrated = await migrateMongo.up(db, client);
      console.log('Migrations applied:', migrated);
      // Close the database connection
      await client.close();
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }
}
