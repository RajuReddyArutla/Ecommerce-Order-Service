
// src/order/order.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param, 
  ParseIntPipe, 
  Query, 
  Patch, 
  Delete 
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './entities/order.entity';

// ✅ REGULAR ORDERS CONTROLLER (Customer + Admin GET ALL)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ✅ NEW: GET ALL ORDERS (This fixes your issue!)
  // MUST BE BEFORE /orders/:id to avoid route conflicts
  @Get()
  async getAllOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    console.log('📊 GET /orders - Fetching all orders. Page:', pageNum, 'Limit:', limitNum);

    const allOrders = await this.orderService.findAll();
    const total = allOrders.length;
    const paginatedOrders = allOrders.slice(skip, skip + limitNum);

    console.log(`✅ Found ${paginatedOrders.length} orders out of ${total} total`);

    return {
      data: paginatedOrders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  // POST /orders - Create new order
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  // GET /orders/user/:userId - Get orders for specific user
  @Get('user/:userId')
  async findUserOrders(@Param('userId', ParseIntPipe) userId: number) {
    console.log(`📦 GET /orders/user/${userId} - Fetching user orders`);
    const orders = await this.orderService.findOrdersByUserId(userId);
    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    return orders;
  }

  // GET /orders/:id - Get single order by ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(`📦 GET /orders/${id} - Fetching single order`);
    return this.orderService.findOrderById(id);
  }

  // PATCH /orders/:id/cancel - Cancel order
  @Patch(':id/cancel')
  async cancelOrder(@Param('id', ParseIntPipe) id: number) {
    console.log(`❌ PATCH /orders/${id}/cancel - Cancelling order`);
    const order = await this.orderService.updateOrderStatus(id, OrderStatus.CANCELLED);
    return {
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    };
  }
}

// ✅ SEPARATE ADMIN ORDERS CONTROLLER (Keep as is)
@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  // GET /admin/orders/statistics - Must be BEFORE /admin/orders/:id
  @Get('statistics')
  async getOrderStatistics() {
    const orders = await this.orderService.findAll();

    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      success: true,
      data: {
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === OrderStatus.PENDING).length,
        completedOrders: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
        totalRevenue: totalRevenue.toFixed(2),
        averageOrderValue: avgOrderValue.toFixed(2),
      },
    };
  }

  // GET /admin/orders
  @Get()
  async getAdminOrders(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const allOrders = await this.orderService.findAll();

    let filteredOrders = allOrders;
    if (status) {
      filteredOrders = allOrders.filter(order => order.status === status);
    }

    const total = filteredOrders.length;
    const paginatedOrders = filteredOrders.slice(skip, skip + limitNum);

    return {
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalCount: total,
          limit: limitNum,
        },
      },
    };
  }

  // GET /admin/orders/:id
  @Get(':id')
  async getAdminOrder(@Param('id', ParseIntPipe) id: number) {
    const order = await this.orderService.findOrderById(id);
    return {
      success: true,
      data: order,
    };
  }

  // PATCH /admin/orders/:id/status
  @Patch(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    const validStatuses = Object.values(OrderStatus);
    if (!validStatuses.includes(status as OrderStatus)) {
      return {
        success: false,
        message: 'Invalid order status',
      };
    }

    const order = await this.orderService.updateOrderStatus(id, status);

    return {
      success: true,
      message: 'Order status updated successfully',
      data: order,
    };
  }

  // DELETE /admin/orders/:id
  @Delete(':id')
  async deleteAdminOrder(@Param('id', ParseIntPipe) id: number) {
    await this.orderService.deleteOrder(id);
    return {
      success: true,
      message: 'Order deleted successfully',
    };
  }
}