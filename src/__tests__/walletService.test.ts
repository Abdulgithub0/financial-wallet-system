import { walletService } from '../services/walletService';
import { db } from '../database/postgres';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';

// Mock dependencies
jest.mock('../database/postgres', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../services/auditService', () => ({
  auditService: {
    logTransaction: jest.fn(),
  },
}));

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletByUserId', () => {
    const userId = 'user-123';
    const mockWallet = {
      id: 'wallet-123',
      user_id: userId,
      currency: 'NGN',
      balance: '1000.00',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return wallet when it exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockWallet] });

      const result = await walletService.getWalletByUserId(userId);

      expect(result).toEqual(mockWallet);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, user_id, currency, balance, created_at, updated_at FROM wallets WHERE user_id = $1',
        [userId]
      );
    });

    it('should return null when wallet does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await walletService.getWalletByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('getBalance', () => {
    const userId = 'user-123';
    const mockWallet = {
      id: 'wallet-123',
      user_id: userId,
      currency: 'NGN',
      balance: '1000.00',
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should return balance and currency when wallet exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockWallet] });

      const result = await walletService.getBalance(userId);

      expect(result).toEqual({
        balance: '1000.00',
        currency: 'NGN',
      });
    });

    it('should throw error when wallet does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(walletService.getBalance(userId)).rejects.toThrow(AppError);
    });
  });

  describe('credit', () => {
    const userId = 'user-123';
    const amount = 500;
    const description = 'Test credit';
    const reference = 'TXN-TEST-001';

    it('should successfully credit wallet', async () => {
      const mockWallet = { id: 'wallet-123', balance: '1000.00' };
      const mockTransaction = {
        id: 'txn-123',
        wallet_id: mockWallet.id,
        user_id: userId,
        type: 'credit',
        amount: '500.00',
        reference,
        description,
        balance_before: '1000.00',
        balance_after: '1500.00',
        status: 'success',
        created_at: new Date(),
      };

      // Mock reference check (no existing transaction)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock transaction
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockWallet] }) // Wallet lock
            .mockResolvedValueOnce({ rows: [] }) // Update balance
            .mockResolvedValueOnce({ rows: [mockTransaction] }), // Insert transaction
        };
        return callback(mockClient as any);
      });

      const result = await walletService.credit(userId, amount, description, reference, '127.0.0.1');

      expect(result).toEqual(mockTransaction);
      expect(auditService.logTransaction).toHaveBeenCalledWith(userId, mockTransaction.id, 'credit', mockTransaction.amount, '127.0.0.1');
    });

    it('should throw error for invalid amount', async () => {
      await expect(walletService.credit(userId, 0, description, reference)).rejects.toThrow(AppError);
      await expect(walletService.credit(userId, 0, description, reference)).rejects.toThrow('Invalid amount');
    });

    it('should throw error for duplicate reference', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'existing-txn' }] });

      await expect(walletService.credit(userId, amount, description, reference)).rejects.toThrow(AppError);
    });

    it('should throw error when wallet not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] }); // Reference check

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [] }), // Wallet not found
        };
        return callback(mockClient as any);
      });

      await expect(walletService.credit(userId, amount, description, reference)).rejects.toThrow(AppError);
    });
  });

  describe('debit', () => {
    const userId = 'user-123';
    const amount = 500;
    const description = 'Test debit';
    const reference = 'TXN-TEST-002';

    it('should successfully debit wallet', async () => {
      const mockWallet = { id: 'wallet-123', balance: '1000.00' };
      const mockTransaction = {
        id: 'txn-124',
        wallet_id: mockWallet.id,
        user_id: userId,
        type: 'debit',
        amount: '500.00',
        reference,
        description,
        balance_before: '1000.00',
        balance_after: '500.00',
        status: 'success',
        created_at: new Date(),
      };

      // Mock reference check (no existing transaction)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock transaction
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [mockWallet] }) // Wallet lock
            .mockResolvedValueOnce({ rows: [] }) // Update balance
            .mockResolvedValueOnce({ rows: [mockTransaction] }), // Insert transaction
        };
        return callback(mockClient as any);
      });

      const result = await walletService.debit(userId, amount, description, reference, '127.0.0.1');

      expect(result).toEqual(mockTransaction);
      expect(auditService.logTransaction).toHaveBeenCalledWith(userId, mockTransaction.id, 'debit', mockTransaction.amount, '127.0.0.1');
    });

    it('should throw error for invalid amount', async () => {
      await expect(walletService.debit(userId, -100, description, reference)).rejects.toThrow(AppError);
      await expect(walletService.debit(userId, -100, description, reference)).rejects.toThrow('Invalid amount');
    });

    it('should throw error for insufficient balance', async () => {
      const mockWallet = { id: 'wallet-123', balance: '100.00' };

      (db.query as jest.Mock).mockResolvedValue({ rows: [] }); // Reference check

      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValue({ rows: [mockWallet] }), // Wallet lock
        };
        return callback(mockClient as any);
      });

      await expect(walletService.debit(userId, 500, description, reference)).rejects.toThrow(AppError);
    });

    it('should throw error for duplicate reference', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'existing-txn' }] });

      await expect(walletService.debit(userId, amount, description, reference)).rejects.toThrow(AppError);
    });
  });

  describe('getTransactionHistory', () => {
    const userId = 'user-123';

    it('should return paginated transaction history', async () => {
      const mockTransactions = [
        {
          id: 'txn-1',
          wallet_id: 'wallet-123',
          user_id: userId,
          type: 'credit',
          amount: '500.00',
          reference: 'TXN-001',
          description: 'Test credit',
          balance_before: '0.00',
          balance_after: '500.00',
          status: 'success',
          created_at: new Date(),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // Count query first
        .mockResolvedValueOnce({ rows: mockTransactions }); // Transactions query

      const result = await walletService.getTransactionHistory(userId, 1, 10);

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});

