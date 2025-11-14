// src/order/entities/order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number; // The user ID from the Auth/User Service

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Column()
    shippingAddress: string; // Stored as a simple string snapshot of the address

    @Column({ length: 50 })
    paymentMethod: string;
    
    @Column({ nullable: true })
    transactionId: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => OrderItem, item => item.order, { cascade: true })
    items: OrderItem[];
}