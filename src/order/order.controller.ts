// src/order/order.controller.ts
import { Controller, Post, Body, Get, Param, ParseIntPipe, HttpStatus } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // POST /orders (Create a new order)
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    // The service handles all validation and orchestration
    return this.orderService.createOrder(createOrderDto);
  }

  // GET /orders/:userId (List all orders for a user)
  // NOTE: In production, the userId must come from the JWT payload.
  @Get('user/:userId')
  async findAll(@Param('userId', ParseIntPipe) userId: number) {
    return this.orderService.findOrdersByUserId(userId);
  }
  
  // GET /orders/:id (View a specific order)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOrderById(id);
  }
}