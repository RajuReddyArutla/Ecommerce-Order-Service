// src/order/order.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderController, AdminOrderController } from './order.controller'; // ✅ Import both controllers
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('USER_SERVICE_HOST') || '127.0.0.1',
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
            port: configService.get<number>('PRODUCTS_SERVICE_PORT') || 3005,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [OrderController, AdminOrderController], // ✅ Register both controllers
  providers: [OrderService],
})
export class OrderModule {}