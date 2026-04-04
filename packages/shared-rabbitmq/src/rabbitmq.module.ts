import { DynamicModule, Module, Global } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { RABBITMQ_MODULE_OPTIONS, type RabbitMQModuleOptions } from './rabbitmq.types';

@Global()
@Module({})
export class RabbitMQModule {
  static forRoot(options: RabbitMQModuleOptions): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        {
          provide: RABBITMQ_MODULE_OPTIONS,
          useValue: options,
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
    };
  }

  static forRootAsync(optionsFactory: {
    useFactory: (...args: unknown[]) => RabbitMQModuleOptions | Promise<RabbitMQModuleOptions>;
    inject?: unknown[];
  }): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        {
          provide: RABBITMQ_MODULE_OPTIONS,
          useFactory: optionsFactory.useFactory,
          inject: optionsFactory.inject ?? [],
        },
        RabbitMQService,
      ],
      exports: [RabbitMQService],
    };
  }
}
