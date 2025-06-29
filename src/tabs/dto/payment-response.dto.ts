import { TabItem, IcafeOrder } from 'src/notes/schemas/tab.schema';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  FAILED = 'failed',
}

export class PaymentResponseDto {
  success: boolean;
  paymentStatus: PaymentStatus;
  message: string;
  icafeOrders: IcafeOrder[];
  failedItems: TabItem[];
  totalProcessed: number;
  totalFailed: number;
  tab: {
    id: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
    totalAmount: number;
    paidAt?: Date;
    closedAt?: Date;
  };
}