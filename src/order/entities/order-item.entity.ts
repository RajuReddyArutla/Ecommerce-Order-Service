// src/order/entities/order-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    orderId: number;

    @Column()
    productId: number; // ID of the product from the Products Service

    @Column({ length: 255 })
    productName: string; // Snapshot of the product name at time of order

    @Column()
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    pricePerUnit: number; // Snapshot of the price at time of order

    @ManyToOne(() => Order, order => order.items)
    @JoinColumn({ name: 'orderId' })
    order: Order;
}