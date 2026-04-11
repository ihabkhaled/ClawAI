import {
  type DynamicModule,
  Module,
  Global,
  type InjectionToken,
  type OptionalFactoryDependency,
} from '@nestjs/common';
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
      exports: [RabbitMQService, RABBITMQ_MODULE_OPTIONS],
    };
  }

  static forRootAsync(optionsFactory: {
    useFactory: (...args: unknown[]) => RabbitMQModuleOptions | Promise<RabbitMQModuleOptions>;
    inject?: Array<InjectionToken | OptionalFactoryDependency>;
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
      exports: [RabbitMQService, RABBITMQ_MODULE_OPTIONS],
    };
  }
}
