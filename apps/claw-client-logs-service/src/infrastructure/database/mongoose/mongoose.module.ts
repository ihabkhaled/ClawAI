import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfig } from '../../../app/config/app.config';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [],
      useFactory: () => {
        const config = AppConfig.get();
        return {
          uri: config.CLIENT_LOGS_MONGODB_URI,
        };
      },
    }),
  ],
})
export class MongooseDatabaseModule {}
