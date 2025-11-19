// // src/order/order.service.ts
// import { 
//   Injectable, 
//   Inject, 
//   BadRequestException, 
//   InternalServerErrorException, 
//   NotFoundException, 
//   HttpException
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, DataSource } from 'typeorm';
// import { ClientProxy } from '@nestjs/microservices';
// import { firstValueFrom } from 'rxjs';
// import { Order, OrderStatus } from './entities/order.entity';
// import { OrderItem } from './entities/order-item.entity';
// import { CreateOrderDto } from './dto/create-order.dto';

// @Injectable()
// export class OrderService {
//   constructor(
//     @InjectRepository(Order) private ordersRepository: Repository<Order>,
//     private dataSource: DataSource,
//     @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
//     @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
//   ) {}

//   /**
//    * Mock Payment Gateway - Simulates a successful payment.
//    */
//   private async processPayment(method: string, amount: number): Promise<string> {
//     if (method !== 'MockPayment') {
//       throw new BadRequestException(`Payment method ${method} not supported.`);
//     }
//     // Simulate API call and success
//     return `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
//   }

//   /**
//    * Orchestrates the entire order creation process.
//    */
//   async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
//     const { userId, shippingAddressId, items, paymentMethod } = createOrderDto;

//     const queryRunner = this.dataSource.createQueryRunner();
//     await queryRunner.connect();
//     await queryRunner.startTransaction();

//     try {
//       // 1. Validate User and Get Address Snapshot
//       const userResponse = await firstValueFrom(
//         this.userClient.send('user.findOne', userId)
//       );
//       if (!userResponse || !userResponse.addresses) {
//         throw new BadRequestException('User or addresses not found.');
//       }
      
//       // 🚀 FIX 1: Ensure comparison works by converting a.id (from microservice/JSON string) to number.
//       const shippingAddress = userResponse.addresses.find(a => +a.id === shippingAddressId);
      
//       if (!shippingAddress) {
//         throw new BadRequestException('Shipping address not valid for this user.');
//       }
//       const addressSnapshot = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`;
      
//       let totalAmount = 0;
//       const orderItems: OrderItem[] = [];

//       // 2. Validate Stock, Get Pricing, and Prepare Items
//       for (const itemDto of items) {
//         const productResponse = await firstValueFrom(
//           this.productsClient.send('product.findOne', itemDto.productId)
//         );

//         if (!productResponse) {
//           throw new NotFoundException(`Product ID ${itemDto.productId} not found.`);
//         }
//         if (productResponse.stockQuantity < itemDto.quantity) {
//           throw new BadRequestException(`Insufficient stock for ${productResponse.name}.`);
//         }
        
//         // Calculate item total and update running total
//         const pricePerUnit = productResponse.price;
//         totalAmount += pricePerUnit * itemDto.quantity;

//         // Prepare OrderItem snapshot
//         orderItems.push(queryRunner.manager.create(OrderItem, {
//           productId: itemDto.productId,
//           productName: productResponse.name,
//           quantity: itemDto.quantity,
//           pricePerUnit: pricePerUnit,
//         }));
//       }

//       // 3. Process Payment (Mock)
//       const transactionId = await this.processPayment(paymentMethod, totalAmount);

//       // 4. Create Order in Orders DB
//       const newOrder = queryRunner.manager.create(Order, {
//         userId,
//         totalAmount,
//         status: OrderStatus.PROCESSING,
//         shippingAddress: addressSnapshot,
//         paymentMethod,
//         transactionId,
//         items: orderItems,
//       });

//       const savedOrder = await queryRunner.manager.save(newOrder);

//       // 5. Update Stock (Critical step: Must be done after order creation!)
//       for (const itemDto of items) {
//         // Quantity change is negative for a purchase
//         await firstValueFrom(
//           this.productsClient.send('product.stock.update', {
//             productId: itemDto.productId,
//             quantityChange: -itemDto.quantity,
//           })
//         );
//       }
      
//       // Commit transaction
//       await queryRunner.commitTransaction();
//       return savedOrder;

//     } catch (error) {
//       // Rollback transaction if any step failed
//       await queryRunner.rollbackTransaction();
      
//       // Log the full error object for debugging
//       console.error('Order creation failed. Full Error:', error);
      
//       // 🚀 FIX 2: Ensure the most robust error checking is used here to prevent crashes
      
//       // A. Handle standard NestJS Exceptions thrown locally
//       if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof HttpException) {
//         throw error;
//       }
      
//       // B. Handle structured microservice errors (status is numeric)
//       if (error.status && typeof error.status === 'number' && error.message) {
//         // Re-throw as a clean HttpException with the correct code
//         throw new HttpException(error.message, error.status);
//       }
      
//       // C. Default fallback for connection errors, timeouts, malformed remote errors, or crashes
//       throw new InternalServerErrorException(
//         error.message || 'Order processing failed due to an unhandled internal service error (Check connection or remote service logs).'
//       );
      
//     } finally {
//       await queryRunner.release();
//     }
//   }

//   async findOrdersByUserId(userId: number): Promise<Order[]> {
//     return this.ordersRepository.find({ 
//         where: { userId }, 
//         relations: ['items'],
//         order: { createdAt: 'DESC' }
//     });
//   }
  
//   async findOrderById(id: number): Promise<Order> {
//     const order = await this.ordersRepository.findOne({ 
//         where: { id },
//         relations: ['items']
//     });
//     if (!order) {
//         throw new NotFoundException(`Order ID ${id} not found.`);
//     }
//     return order;
//   }
// }


// src/order/order.service.ts
import { 
  Injectable, 
  Inject, 
  BadRequestException, 
  InternalServerErrorException, 
  NotFoundException, 
  HttpException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemsRepository: Repository<OrderItem>, // ✅ Add this
    private dataSource: DataSource,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  /**
   * Mock Payment Gateway - Simulates a successful payment.
   */
  private async processPayment(method: string, amount: number): Promise<string> {
    if (method !== 'MockPayment') {
      throw new BadRequestException(`Payment method ${method} not supported.`);
    }
    // Simulate API call and success
    return `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Orchestrates the entire order creation process.
   */
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { userId, shippingAddressId, items, paymentMethod } = createOrderDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate User and Get Address Snapshot
      const userResponse = await firstValueFrom(
        this.userClient.send('user.findOne', userId)
      );
      if (!userResponse || !userResponse.addresses) {
        throw new BadRequestException('User or addresses not found.');
      }
      
      const shippingAddress = userResponse.addresses.find(a => +a.id === shippingAddressId);
      
      if (!shippingAddress) {
        throw new BadRequestException('Shipping address not valid for this user.');
      }
      const addressSnapshot = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`;
      
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      // 2. Validate Stock, Get Pricing, and Prepare Items
      for (const itemDto of items) {
        const productResponse = await firstValueFrom(
          this.productsClient.send('product.findOne', itemDto.productId)
        );

        if (!productResponse) {
          throw new NotFoundException(`Product ID ${itemDto.productId} not found.`);
        }
        if (productResponse.stockQuantity < itemDto.quantity) {
          throw new BadRequestException(`Insufficient stock for ${productResponse.name}.`);
        }
        
        // Calculate item total and update running total
        const pricePerUnit = productResponse.price;
        totalAmount += pricePerUnit * itemDto.quantity;

        // Prepare OrderItem snapshot
        orderItems.push(queryRunner.manager.create(OrderItem, {
          productId: itemDto.productId,
          productName: productResponse.name,
          quantity: itemDto.quantity,
          pricePerUnit: pricePerUnit,
        }));
      }

      // 3. Process Payment (Mock)
      const transactionId = await this.processPayment(paymentMethod, totalAmount);

      // 4. Create Order in Orders DB
      const newOrder = queryRunner.manager.create(Order, {
        userId,
        totalAmount,
        status: OrderStatus.PROCESSING,
        shippingAddress: addressSnapshot,
        paymentMethod,
        transactionId,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(newOrder);

      // 5. Update Stock (Critical step: Must be done after order creation!)
      for (const itemDto of items) {
        // Quantity change is negative for a purchase
        await firstValueFrom(
          this.productsClient.send('product.stock.update', {
            productId: itemDto.productId,
            quantityChange: -itemDto.quantity,
          })
        );
      }
      
      // Commit transaction
      await queryRunner.commitTransaction();
      return savedOrder;

    } catch (error) {
      // Rollback transaction if any step failed
      await queryRunner.rollbackTransaction();
      
      // Log the full error object for debugging
      console.error('Order creation failed. Full Error:', error);
      
      // A. Handle standard NestJS Exceptions thrown locally
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      
      // B. Handle structured microservice errors (status is numeric)
      if (error.status && typeof error.status === 'number' && error.message) {
        // Re-throw as a clean HttpException with the correct code
        throw new HttpException(error.message, error.status);
      }
      
      // C. Default fallback for connection errors, timeouts, malformed remote errors, or crashes
      throw new InternalServerErrorException(
        error.message || 'Order processing failed due to an unhandled internal service error (Check connection or remote service logs).'
      );
      
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================
  // ========== EXISTING METHODS ==========
  // =========================================================

  async findOrdersByUserId(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({ 
      where: { userId }, 
      relations: ['items'],
      order: { createdAt: 'DESC' }
    });
  }
  
  async findOrderById(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({ 
      where: { id },
      relations: ['items']
    });
    if (!order) {
      throw new NotFoundException(`Order ID ${id} not found.`);
    }
    return order;
  }

  // =========================================================
  // ========== NEW ADMIN METHODS (ADD THESE) ==========
  // =========================================================

  /**
   * Get all orders (for admin)
   */
  async findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update order status (for admin)
   */
  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order ID ${orderId} not found.`);
    }

    // Validate status enum
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    order.status = status as OrderStatus;
    return this.ordersRepository.save(order);
  }

  /**
   * Delete order (for admin)
   */
  async deleteOrder(orderId: number): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order ID ${orderId} not found.`);
    }

    // Delete order items first (cascade should handle this, but explicit is safer)
    if (order.items && order.items.length > 0) {
      await this.orderItemsRepository.remove(order.items);
    }

    // Delete the order
    await this.ordersRepository.remove(order);
  }
}