export interface BillingLogDto {
  log_id: number;
  log_icafe_id: number;
  log_date: string;
  log_member_account: string;
  log_pc_name: string;
  log_event: string;
  log_money: string;
  log_spend: string;
  log_card: string;
  log_bonus: string;
  log_coin: string;
  log_used_secs: string;
  log_details: string;
  log_staff_name: string;
  log_date_local: string;
}

export interface BillingLogResponseDto {
  log_list: BillingLogDto[];
  paging_info: {
    total_records: number;
    pages: number;
    page: string;
    page_prev: number;
    page_next: number;
    page_start: number;
    page_end: number;
    start_from: string;
    end_from: string;
  };
  total: {
    log_bonus: string;
    log_money: string;
    log_coin: string;
    log_spend: string;
    log_card: string;
    log_used_secs: string;
  };
  event_list: string[];
}
