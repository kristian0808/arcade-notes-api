import { IsNotEmpty, IsEnum } from 'class-validator';

export enum PaymentMethod {
  CASH = 'cash',
  BALANCE = 'balance',
  CARD = 'card',
}

export class ProcessPaymentDto {
  @IsNotEmpty()
  @IsEnum(PaymentMethod, {
    message: 'Payment method must be one of: cash, balance, card',
  })
  paymentMethod: PaymentMethod;
}