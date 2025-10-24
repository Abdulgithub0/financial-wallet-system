export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  phone_number: string | null;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export type UserProfile = Omit<User, 'password_hash' | 'updated_at'>;

export interface Wallet {
  id: string;
  user_id: string;
  currency: string;
  balance: string;
  created_at: Date;
  updated_at: Date;
}

export type TransactionStatus = 'success' | 'pending' | 'failed';

export type TransactionType = 'credit' | 'debit' | 'transfer_in' | 'transfer_out';

export interface Transaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: TransactionType;
  amount: string;
  reference: string;
  description: string | null;
  balance_before: string;
  balance_after: string;
  status: TransactionStatus;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface AuditLog {
  id: number;
  actor_id: string | null;
  event_type: string;
  event_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;  
  phone_number?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TransactionHistory {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TransactionRequest {
  amount: number;
  description?: string;
  reference?: string;
}


export interface TransferRequest {
  recipient_email?: string;
  recipient_user_id?: string;
  amount: number;
  description?: string;
  reference?: string;
}

// I structure the interface this way so it can be sent to the probably a notification service.
// The notification service uses this response to differentiate between the sender and recipient
// and then dispatch the appropriate notifications contents via right channels.

export interface TransferResponse {
  sender_transaction: Transaction;
  recipient_transaction: Transaction;
  sender_new_balance: string;
  recipient_new_balance: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

