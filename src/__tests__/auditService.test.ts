import { auditService } from '../services/auditService';
import { db } from '../database/postgres';

// Mock database
jest.mock('../database/postgres', () => ({
  db: {
    query: jest.fn(),
  },
}));

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('log', () => {
    it('should successfully create an audit log', async () => {
      const auditData = {
        actorId: 'user-123',
        eventType: 'TEST_EVENT',
        eventData: { key: 'value' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.log(auditData);

      expect(db.query).toHaveBeenCalledWith(
        `INSERT INTO audit_logs (actor_id, event_type, event_data, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          auditData.actorId,
          auditData.eventType,
          JSON.stringify(auditData.eventData),
          auditData.ipAddress,
          auditData.userAgent,
        ]
      );
    });

    it('should handle null optional fields', async () => {
      const auditData = {
        actorId: 'user-123',
        eventType: 'TEST_EVENT',
        eventData: { key: 'value' },
      };

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.log(auditData);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          auditData.actorId,
          auditData.eventType,
          JSON.stringify(auditData.eventData),
          null,
          null,
        ]
      );
    });

    it('should catch and log errors without throwing', async () => {
      const auditData = {
        actorId: 'user-123',
        eventType: 'TEST_EVENT',
        eventData: { key: 'value' },
      };

      const error = new Error('Database error');
      (db.query as jest.Mock).mockRejectedValueOnce(error);

      // Should not throw
      await expect(auditService.log(auditData)).resolves.not.toThrow();

      expect(console.error).toHaveBeenCalledWith('Failed to create audit log:', error);
    });
  });

  describe('logUserRegistration', () => {
    it('should log user registration event', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.logUserRegistration(userId, email, ipAddress);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          userId,
          'USER_REGISTERED',
          JSON.stringify({ email }),
          ipAddress,
          null,
        ]
      );
    });

    it('should log user registration without IP address', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.logUserRegistration(userId, email);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          userId,
          'USER_REGISTERED',
          JSON.stringify({ email }),
          null,
          null,
        ]
      );
    });
  });

  describe('logUserLogin', () => {
    it('should log user login event', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const ipAddress = '127.0.0.1';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.logUserLogin(userId, email, ipAddress);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          userId,
          'USER_LOGIN',
          JSON.stringify({ email }),
          ipAddress,
          null,
        ]
      );
    });
  });

  describe('logTransaction', () => {
    it('should log transaction event', async () => {
      const userId = 'user-123';
      const transactionId = 'txn-456';
      const type = 'credit';
      const amount = '1000.00';
      const ipAddress = '127.0.0.1';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.logTransaction(userId, transactionId, type, amount, ipAddress);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          userId,
          'TRANSACTION_CREATED',
          JSON.stringify({ transactionId, type, amount }),
          ipAddress,
          null,
        ]
      );
    });

    it('should log transaction without IP address', async () => {
      const userId = 'user-123';
      const transactionId = 'txn-456';
      const type = 'debit';
      const amount = '500.00';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await auditService.logTransaction(userId, transactionId, type, amount);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [
          userId,
          'TRANSACTION_CREATED',
          JSON.stringify({ transactionId, type, amount }),
          null,
          null,
        ]
      );
    });
  });
});

