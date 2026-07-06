export type PaymentMode = 'CASH' | 'ONLINE';

export interface User {
  user_id: number;
  username: string;
  password_hash: string;
  role: 'OPERATOR' | 'MANAGEMENT';
  is_active: boolean;
  terminal_id?: string;
}

export interface Transaction {
  transaction_id: number;
  operator_id: number; // foreign key references User.user_id
  quantity: number;
  ticket_price: number;
  total_amount: number;
  payment_mode: PaymentMode;
  created_at: string; // ISO timestamp
}

export type UserRole = 'OPERATOR' | 'MANAGEMENT';

export interface SystemMetrics {
  totalRevenue: number;
  cashRevenue: number;
  onlineRevenue: number;
  totalTicketsSold: number;
}
