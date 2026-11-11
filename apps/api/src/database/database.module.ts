import { Global, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { loadEnv } from "../common/env.js";
import { createDatabase, type Database } from "./client.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly bundle = createDatabase(loadEnv().DATABASE_URL);

  get db(): Database {
    return this.bundle.db;
  }

  async onModuleDestroy() {
    await this.bundle.client.end({ timeout: 5 });
  }
}

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
