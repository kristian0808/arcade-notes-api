import { TabItem, IcafeOrder } from 'src/notes/schemas/tab.schema';

export class TabResponseDto {
  id: string;
  memberId: number;
  memberAccount: string;
  pcName?: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  icafeOrders: IcafeOrder[];
  failedItems: TabItem[];
  items: TabItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  paidAt?: Date;
}
