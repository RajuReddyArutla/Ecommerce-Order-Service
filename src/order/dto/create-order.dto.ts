// src/order/dto/create-order.dto.ts
import { IsNotEmpty, IsInt, Min, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class ItemDto {
    @IsInt()
    @Min(1)
    productId: number;

    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto {
    // NOTE: userId should come from the JWT, not the request body in a real app.
    // We include it here temporarily for easy Postman testing.
    @IsInt()
    @IsNotEmpty()
    userId: number; 

    @IsInt()
    @IsNotEmpty()
    shippingAddressId: number; // The ID of the address stored in the User Service

    @IsNotEmpty()
    @IsString()
    paymentMethod: string; // e.g., 'CreditCard', 'PayPal', 'MockPayment'

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemDto)
    items: ItemDto[];
}