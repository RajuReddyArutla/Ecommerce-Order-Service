// src/order/order.module.ts (orders-service)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    
    // Microservice clients configuration
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('USER_SERVICE_HOST') || '127.0.0.1',
            // 🚀 FIX 1: User Service default is 3003 (as confirmed previously)
            port: configService.get<number>('USER_SERVICE_PORT') || 3003,
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'PRODUCTS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('PRODUCTS_SERVICE_HOST') || '127.0.0.1',
            // 🚀 FIX 2: Products Service default is 3005 (as confirmed by its main.ts)
            port: configService.get<number>('PRODUCTS_SERVICE_PORT') || 3005,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}