import { walletService } from '../services/walletService';
import { db } from '../database/postgres';
import { AppError } from '../middleware/errorHandler';

// Mock the database
jest.mock('../database/postgres', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock audit service
jest.mock('../services/auditService', () => ({
  auditService: {
    logTransaction: jest.fn(),
  },
}));

describe('WalletService - Transfer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transfer', () => {
    const senderUserId = 'sender-123';
    const recipientUserId = 'recipient-456';
    const recipientEmail = 'recipient@example.com';
    const amount = 100;
    const description = 'Test transfer';
    const reference = 'TXN-TEST-001';

    it('should successfully transfer funds between users using recipient email', async () => {
      // Mock reference check (no existing transaction)
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient lookup by email
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: recipientUserId }],
      });

      // Mock transaction
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            // Sender wallet lock
            .mockResolvedValueOnce({
              rows: [{ id: 'wallet-sender', balance: '500.00' }],
            })
            // Recipient wallet lock
            .mockResolvedValueOnce({
              rows: [{ id: 'wallet-recipient', balance: '200.00' }],
            })
            // Update sender balance
            .mockResolvedValueOnce({ rows: [] })
            // Update recipient balance
            .mockResolvedValueOnce({ rows: [] })
            // Insert sender transaction
            .mockResolvedValueOnce({
              rows: [
                {
                  id: 'txn-sender',
                  wallet_id: 'wallet-sender',
                  user_id: senderUserId,
                  type: 'transfer_out',
                  amount: '100.00',
                  reference,
                  description: `${description} to user ${recipientUserId}`,
                  balance_before: '500.00',
                  balance_after: '400.00',
                  status: 'success',
                  created_at: new Date(),
                },
              ],
            })
            // Insert recipient transaction
            .mockResolvedValueOnce({
              rows: [
                {
                  id: 'txn-recipient',
                  wallet_id: 'wallet-recipient',
                  user_id: recipientUserId,
                  type: 'transfer_in',
                  amount: '100.00',
                  reference,
                  description: `${description} from user ${senderUserId}`,
                  balance_before: '200.00',
                  balance_after: '300.00',
                  status: 'success',
                  created_at: new Date(),
                },
              ],
            }),
        };
        return callback(mockClient);
      });

      const result = await walletService.transfer(
        senderUserId,
        recipientEmail,
        undefined,
        amount,
        description,
        reference
      );

      expect(result).toBeDefined();
      expect(result.sender_transaction.type).toBe('transfer_out');
      expect(result.recipient_transaction.type).toBe('transfer_in');
      expect(result.sender_new_balance).toBe('400.00');
      expect(result.recipient_new_balance).toBe('300.00');
    });

    it('should successfully transfer funds using recipient user ID', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient lookup by ID
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: recipientUserId }],
      });

      // Mock transaction (simplified)
      (db.transaction as jest.Mock).mockResolvedValue({
        sender_transaction: {
          id: 'txn-sender',
          type: 'transfer_out',
          amount: '100.00',
        },
        recipient_transaction: {
          id: 'txn-recipient',
          type: 'transfer_in',
          amount: '100.00',
        },
        sender_new_balance: '400.00',
        recipient_new_balance: '300.00',
      });

      const result = await walletService.transfer(
        senderUserId,
        undefined,
        recipientUserId,
        amount,
        description,
        reference
      );

      expect(result).toBeDefined();
      expect(db.query).toHaveBeenCalledWith('SELECT id FROM users WHERE id = $1', [
        recipientUserId,
      ]);
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, 0, description, reference)
      ).rejects.toThrow(AppError);

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, -100, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when neither recipient email nor ID is provided', async () => {
      await expect(
        walletService.transfer(senderUserId, undefined, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error for duplicate transaction reference', async () => {
      // Mock existing transaction with same reference
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'existing-txn' }],
      });

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when recipient user not found by email', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient not found
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when recipient user not found by ID', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient not found
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        walletService.transfer(senderUserId, undefined, recipientUserId, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error for self-transfer', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient lookup returns same user
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: senderUserId }],
      });

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when sender has insufficient balance', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient lookup
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: recipientUserId }],
      });

      // Mock transaction with insufficient balance
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            // Sender wallet with low balance
            .mockResolvedValueOnce({
              rows: [{ id: 'wallet-sender', balance: '50.00' }],
            }),
        };
        return callback(mockClient);
      });

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when sender wallet not found', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient lookup
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: recipientUserId }],
      });

      // Mock transaction with no sender wallet
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return callback(mockClient);
      });

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });

    it('should throw error when recipient wallet not found', async () => {
      // Mock reference check
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Mock recipient lookup
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: recipientUserId }],
      });

      // Mock transaction
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            // Sender wallet found
            .mockResolvedValueOnce({
              rows: [{ id: 'wallet-sender', balance: '500.00' }],
            })
            // Recipient wallet not found
            .mockResolvedValueOnce({ rows: [] }),
        };
        return callback(mockClient);
      });

      await expect(
        walletService.transfer(senderUserId, recipientEmail, undefined, amount, description, reference)
      ).rejects.toThrow(AppError);
    });
  });
});

