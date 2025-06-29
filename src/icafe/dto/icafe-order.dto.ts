import { IsNotEmpty, IsArray, IsNumber, IsString } from 'class-validator';

export class IcafeOrderDto {
  @IsArray()
  @IsNotEmpty()
  product_id: string[];

  @IsArray()
  @IsNotEmpty()
  order_item_qty: number[];

  @IsNumber()
  @IsNotEmpty()
  order_payment_method: number; // 0=cash, 1=balance, 2=card

  @IsNumber()
  @IsNotEmpty()
  order_member_id: number;

  @IsString()
  @IsNotEmpty()
  order_member_account: string;

  @IsNumber()
  @IsNotEmpty()
  order_status: number; // 2=done, 5=preparing
}

export class IcafeOrderResponseDto {
  code: number;
  message: string;
  data: {
    order_no: number;
    member_id: number;
    qty_changed_products: Array<{
      id: string;
      qty: number;
    }>;
    shop_badge: number;
  };
}

export class IcafeProductDto {
  product_id: string;
  product_name: string;
  product_qty: number;
  product_price: string;
  product_tax_id: number;
  product_unlimited: number;
  sort_qty: number;
  product_group_id: number;
  product_barcode: string;
  product_pc_groups: string;
  product_member_groups: string;
  product_show_weekday: string;
  product_show_time: string;
  product_enable_code: number;
  product_enable_discount: number;
  product_is_offer: number;
  product_parent_group_id: number;
  product_group_name: string;
}

export class IcafeProductListResponseDto {
  code: number;
  message: string;
  data: {
    product_group_list: Array<{
      product_group_id: number;
      product_group_name: string;
      product_parent_group_id: number;
    }>;
    product_list: IcafeProductDto[];
  };
}