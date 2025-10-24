// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock config
jest.mock('../config/env', () => ({
  config: {
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
  },
}));

describe('Database', () => {
  let db: any;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Get fresh instance of Pool mock
    const { Pool: MockPool } = require('pg');
    mockPool = new MockPool();

    // Import Database class after mocks are set up
    const dbModule = require('../database/postgres');
    db = dbModule.db;
  });

  describe('constructor', () => {
    it('should create a pool with correct configuration', () => {
      const { Pool: MockPool } = require('pg');

      expect(MockPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        max: 20,
        idleTimeoutMillis: 40000,
        connectionTimeoutMillis: 2000,
      });
    });

    it('should set up error handler on pool', () => {
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('query', () => {
    it('should execute query and return result', async () => {
      const queryText = 'SELECT * FROM users WHERE id = $1';
      const params = ['user-123'];
      const mockResult = { rows: [{ id: 'user-123', name: 'Test User' }], rowCount: 1 };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await db.query(queryText, params);

      expect(mockPool.query).toHaveBeenCalledWith(queryText, params);
      expect(result).toEqual(mockResult);
    });

    it('should log query execution details', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const queryText = 'SELECT * FROM users';
      const mockResult = { rows: [], rowCount: 0 };

      mockPool.query.mockResolvedValueOnce(mockResult);

      await db.query(queryText);

      expect(consoleSpy).toHaveBeenCalledWith('Executed query', expect.objectContaining({
        text: queryText,
        duration: expect.any(Number),
        rows: 0,
      }));

      consoleSpy.mockRestore();
    });

    it('should log and throw error on query failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const queryText = 'INVALID SQL';
      const error = new Error('Syntax error');

      mockPool.query.mockRejectedValueOnce(error);

      await expect(db.query(queryText)).rejects.toThrow(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Database query error', {
        text: queryText,
        error,
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getClient', () => {
    it('should return a client from the pool', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const client = await db.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toEqual(mockClient);
    });
  });

  describe('transaction', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
    });

    it('should execute callback within a transaction and commit', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}); // COMMIT

      const result = await db.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(db.transaction(callback)).rejects.toThrow(error);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if rollback fails', async () => {
      const error = new Error('Transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Rollback failed')); // ROLLBACK fails

      await expect(db.transaction(callback)).rejects.toThrow('Rollback failed');

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle complex transaction with multiple queries', async () => {
      const callback = jest.fn(async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['Test']);
        await client.query('INSERT INTO wallets (user_id) VALUES ($1)', ['user-123']);
        return 'success';
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // INSERT users
        .mockResolvedValueOnce({}) // INSERT wallets
        .mockResolvedValueOnce({}); // COMMIT

      const result = await db.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(result).toBe('success');
    });
  });

  describe('close', () => {
    it('should end the pool connection', async () => {
      mockPool.end.mockResolvedValueOnce(undefined);

      await db.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});

