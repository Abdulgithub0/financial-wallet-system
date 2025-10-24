import { authService } from '../services/authService';
import { db } from '../database/postgres';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/auditService';

// Mock dependencies
jest.mock('../database/postgres', () => ({
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../utils/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../utils/jwt', () => ({
  generateToken: jest.fn(),
}));

jest.mock('../services/auditService', () => ({
  auditService: {
    logUserRegistration: jest.fn(),
    logUserLogin: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      full_name: 'Test User',
      phone_number: '+2348012345678',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashed_password';
      const userId = 'user-123';
      const token = 'jwt-token';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // No existing user
      (hashPassword as jest.Mock).mockResolvedValueOnce(hashedPassword);
      (db.transaction as jest.Mock).mockImplementation(async (callback) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({
              rows: [{
                id: userId,
                email: validRegisterData.email,
                full_name: validRegisterData.full_name,
                phone_number: validRegisterData.phone_number,
                is_verified: false,
                created_at: new Date(),
              }],
            })
            .mockResolvedValueOnce({ rows: [] }), // Wallet creation
        };
        return callback(mockClient as any);
      });
      (generateToken as jest.Mock).mockReturnValueOnce(token);

      const result = await authService.register(validRegisterData, '127.0.0.1');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(validRegisterData.email);
      expect(result.token).toBe(token);
      expect(auditService.logUserRegistration).toHaveBeenCalledWith(userId, validRegisterData.email, '127.0.0.1');
    });

    it('should throw error for missing full_name', async () => {
      const invalidData = { ...validRegisterData, full_name: '' };

      await expect(authService.register(invalidData)).rejects.toThrow(AppError);
      await expect(authService.register(invalidData)).rejects.toThrow('Full name is required');
    });

    it('should throw error for invalid email', async () => {
      const invalidData = { ...validRegisterData, email: 'invalid-email' };

      await expect(authService.register(invalidData)).rejects.toThrow(AppError);
      await expect(authService.register(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      const invalidData = { ...validRegisterData, password: '123' };

      await expect(authService.register(invalidData)).rejects.toThrow(AppError);
      await expect(authService.register(invalidData)).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should throw error for invalid phone number', async () => {
      const invalidData = { ...validRegisterData, phone_number: 'invalid' };

      await expect(authService.register(invalidData)).rejects.toThrow(AppError);
    });

    it('should throw error when email already exists', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'existing-user' }] });

      await expect(authService.register(validRegisterData)).rejects.toThrow(AppError);
    });

    it('should throw error when phone number already exists', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'existing-user' }] });

      await expect(authService.register(validRegisterData)).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      full_name: 'Test User',
      phone_number: '+2348012345678',
      is_verified: false,
      created_at: new Date(),
    };

    it('should successfully login with valid credentials', async () => {
      const token = 'jwt-token';

      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });
      (comparePassword as jest.Mock).mockResolvedValueOnce(true);
      (generateToken as jest.Mock).mockReturnValueOnce(token);

      const result = await authService.login(validLoginData, '127.0.0.1');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(validLoginData.email);
      expect(result.token).toBe(token);
      expect(auditService.logUserLogin).toHaveBeenCalledWith(mockUser.id, mockUser.email, '127.0.0.1');
    });

    it('should throw error for invalid email format', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email' };

      await expect(authService.login(invalidData)).rejects.toThrow(AppError);
      await expect(authService.login(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should throw error when user does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(authService.login(validLoginData)).rejects.toThrow(AppError);
    });

    it('should throw error for incorrect password', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [mockUser] });
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(validLoginData)).rejects.toThrow(AppError);
    });
  });

  describe('getUserById', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      full_name: 'Test User',
      phone_number: '+2348012345678',
      is_verified: false,
      created_at: new Date(),
    };

    it('should return user profile when user exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.getUserById(userId);

      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, full_name, phone_number, is_verified, created_at FROM users WHERE id = $1',
        [userId]
      );
    });

    it('should return null when user does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await authService.getUserById(userId);

      expect(result).toBeNull();
    });
  });
});

