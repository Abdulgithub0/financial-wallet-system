import { db } from '../database/postgres';
import { AppError } from '../middleware/errorHandler';
import { Wallet, Transaction, TransferResponse } from '../types';
import { isValidAmount } from '../utils/validators';
import { generateTransactionReference } from '../utils/reference';
import { auditService } from './auditService';

export class WalletService {
  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    const result = await db.query(
      'SELECT id, user_id, currency, balance, created_at, updated_at FROM wallets WHERE user_id = $1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getBalance(userId: string): Promise<{ balance: string; currency: string }> {
    const wallet = await this.getWalletByUserId(userId);

    if (!wallet) {
      throw new AppError(404, 'Wallet not found');
    }

    return {
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  async credit(
    userId: string,
    amount: number,
    description?: string,
    reference?: string,
    ipAddress?: string
  ): Promise<Transaction> {
    if (!isValidAmount(amount)) {
      throw new AppError(400, 'Invalid amount');
    }

    const txnReference = reference || generateTransactionReference();

    const existingTxn = await db.query('SELECT id FROM transactions WHERE reference = $1', [txnReference]);
    if (existingTxn.rows.length > 0) {
      throw new AppError(409, 'Transaction reference already exists');
    }

    const transaction = await db.transaction(async (client) => {
      const walletResult = await client.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new AppError(404, 'Wallet not found');
      }

      const wallet = walletResult.rows[0];
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      await client.query(
        'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
        [amount, wallet.id]
      );

      const txnResult = await client.query(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status, created_at`,
        [
          wallet.id,
          userId,
          'credit',
          amount,
          txnReference,
          description || null,
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          'success',
        ]
      );

      return txnResult.rows[0];
    });

    await auditService.logTransaction(userId, transaction.id, 'credit', transaction.amount, ipAddress);

    return transaction;
  }

  async debit(
    userId: string,
    amount: number,
    description?: string,
    reference?: string,
    ipAddress?: string
  ): Promise<Transaction> {
    if (!isValidAmount(amount)) {
      throw new AppError(400, 'Invalid amount');
    }

    const txnReference = reference || generateTransactionReference();

    const existingTxn = await db.query('SELECT id FROM transactions WHERE reference = $1', [txnReference]);
    if (existingTxn.rows.length > 0) {
      throw new AppError(409, 'Transaction reference already exists');
    }

    const transaction = await db.transaction(async (client) => {
      const walletResult = await client.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        throw new AppError(404, 'Wallet not found');
      }

      const wallet = walletResult.rows[0];
      const balanceBefore = parseFloat(wallet.balance);

      if (balanceBefore < amount) {
        throw new AppError(400, 'Insufficient balance');
      }

      const balanceAfter = balanceBefore - amount;

      await client.query(
        'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
        [amount, wallet.id]
      );

      const txnResult = await client.query(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status, created_at`,
        [
          wallet.id,
          userId,
          'debit',
          amount,
          txnReference,
          description || null,
          balanceBefore.toFixed(2),
          balanceAfter.toFixed(2),
          'success',
        ]
      );

      return txnResult.rows[0];
    });

    await auditService.logTransaction(userId, transaction.id, 'debit', transaction.amount, ipAddress);

    return transaction;
  }

  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: Transaction[]; total: number; page: number; totalPages: number }> {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) FROM transactions WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query(
      `SELECT id, wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status, created_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      transactions: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionByReference(reference: string, userId: string): Promise<Transaction | null> {
    const result = await db.query(
      `SELECT id, wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status, created_at
       FROM transactions
       WHERE reference = $1 AND user_id = $2`,
      [reference, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async transfer(
    senderUserId: string,
    recipientEmail: string | undefined,
    recipientUserId: string | undefined,
    amount: number,
    description?: string,
    reference?: string,
    ipAddress?: string
  ): Promise<TransferResponse> {
    if (!isValidAmount(amount)) {
      throw new AppError(400, 'Invalid amount');
    }

    if (!recipientEmail && !recipientUserId) {
      throw new AppError(400, 'Either recipient_email or recipient_user_id must be provided');
    }

    const txnReference = reference || generateTransactionReference();

    const existingTxn = await db.query('SELECT id FROM transactions WHERE reference = $1', [txnReference]);
    if (existingTxn.rows.length > 0) {
      throw new AppError(409, 'Transaction reference already exists');
    }

    let recipientId: string;

    if (recipientEmail) {
      const recipientResult = await db.query('SELECT id FROM users WHERE email = $1', [recipientEmail]);
      if (recipientResult.rows.length === 0) {
        throw new AppError(404, 'Recipient user not found');
      }
      recipientId = recipientResult.rows[0].id;
    } else if (recipientUserId) {
      const recipientResult = await db.query('SELECT id FROM users WHERE id = $1', [recipientUserId]);
      if (recipientResult.rows.length === 0) {
        throw new AppError(404, 'Recipient user not found');
      }
      recipientId = recipientUserId;
    } else {
      throw new AppError(400, 'Recipient identifier is required');
    }

    if (senderUserId === recipientId) {
      throw new AppError(400, 'Cannot transfer to yourself');
    }

    const result = await db.transaction(async (client) => {
      const senderWalletResult = await client.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [senderUserId]
      );

      if (senderWalletResult.rows.length === 0) {
        throw new AppError(404, 'Sender wallet not found');
      }

      const senderWallet = senderWalletResult.rows[0];
      const senderBalanceBefore = parseFloat(senderWallet.balance);

      if (senderBalanceBefore < amount) {
        throw new AppError(400, 'Insufficient balance');
      }

      const recipientWalletResult = await client.query(
        'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
        [recipientId]
      );

      if (recipientWalletResult.rows.length === 0) {
        throw new AppError(404, 'Recipient wallet not found');
      }

      const recipientWallet = recipientWalletResult.rows[0];
      const recipientBalanceBefore = parseFloat(recipientWallet.balance);

      const senderBalanceAfter = senderBalanceBefore - amount;
      const recipientBalanceAfter = recipientBalanceBefore + amount;

      await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, senderWallet.id]);

      await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, recipientWallet.id]);

      const transferDescription = description || 'Transfer';

      const senderTxnResult = await client.query(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status, created_at`,
        [
          senderWallet.id,
          senderUserId,
          'transfer_out',
          amount,
          `${txnReference}-OUT`,
          `${transferDescription} to user ${recipientId}`,
          senderBalanceBefore.toFixed(2),
          senderBalanceAfter.toFixed(2),
          'success',
        ]
      );

      const recipientTxnResult = await client.query(
        `INSERT INTO transactions (wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, wallet_id, user_id, type, amount, reference, description, balance_before, balance_after, status, created_at`,
        [
          recipientWallet.id,
          recipientId,
          'transfer_in',
          amount,
          `${txnReference}-IN`,
          `${transferDescription} from user ${senderUserId}`,
          recipientBalanceBefore.toFixed(2),
          recipientBalanceAfter.toFixed(2),
          'success',
        ]
      );

      return {
        sender_transaction: senderTxnResult.rows[0],
        recipient_transaction: recipientTxnResult.rows[0],
        sender_new_balance: senderBalanceAfter.toFixed(2),
        recipient_new_balance: recipientBalanceAfter.toFixed(2),
      };
    });

    await auditService.logTransaction(
      senderUserId,
      result.sender_transaction.id,
      'transfer_out',
      result.sender_transaction.amount,
      ipAddress
    );

    await auditService.logTransaction(
      recipientId,
      result.recipient_transaction.id,
      'transfer_in',
      result.recipient_transaction.amount,
      ipAddress
    );

    return result;
  }
}

export const walletService = new WalletService();

