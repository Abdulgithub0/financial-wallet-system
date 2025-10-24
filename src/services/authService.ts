import { db } from '../database/postgres';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { isValidEmail, isValidPassword, isValidPhoneNumber } from '../utils/validators';
import { AppError } from '../middleware/errorHandler';
import { RegisterRequest, LoginRequest, UserProfile } from '../types';
import { auditService } from './auditService';

export class AuthService {
  async register(data: RegisterRequest, ipAddress?: string): Promise<{ user: UserProfile; token: string }> {
  
    let isError = false, message = '';
    
    if (!data.full_name || data.full_name.trim() === '') {
      isError = true; message = 'Full name is required';
    }

    if (!isValidEmail(data.email)) {
      message = isError ? message + ', Invalid email format' : 'Invalid email format';
      isError = true;
    }

    if (!isValidPassword(data.password)) {
      message = isError ? message + ', Password must be at least 8 characters long' : 'Password must be at least 8 characters long';
      isError = true;
    }

    if (!isValidPhoneNumber(data.phone_number || '')) {
      message = isError ? message + ', Invalid phone number format' : 'Invalid phone number format';
      isError = true;
    }

    if(isError) {
      throw new AppError(400, message);
    }

    const existingUserQuery = data.phone_number
      ? 'SELECT id FROM users WHERE email = $1 OR phone_number = $2'
      : 'SELECT id FROM users WHERE email = $1';

    const existingUserParams = data.phone_number
      ? [data.email, data.phone_number]
      : [data.email];

    const existingUser = await db.query(existingUserQuery, existingUserParams);

    if (existingUser.rows.length > 0) {
      // I intentionally not revealing which field is already registered, to avoid information leakage
      throw new AppError(409, 'Email or phone number already registered');
    }

    const passwordHash = await hashPassword(data.password);

    const result = await db.transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, phone_number, is_verified, created_at`,
        [data.email, passwordHash, data.full_name.trim(), data.phone_number || null]
      );

      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO wallets (user_id, currency, balance)
         VALUES ($1, $2, $3)`,
        [user.id, 'NGN', 0.00]
      );

      return user;
    });

    await auditService.logUserRegistration(result.id, result.email, ipAddress);

    const token = generateToken({ userId: result.id, email: result.email });

    return {
      user: {
        id: result.id,
        email: result.email,
        full_name: result.full_name,
        phone_number: result.phone_number,
        is_verified: result.is_verified,
        created_at: result.created_at,
      },
      token,
    };
  }

  async login(data: LoginRequest, ipAddress?: string): Promise<{ user: UserProfile; token: string }> {
    if (!isValidEmail(data.email)) {
      throw new AppError(400, 'Invalid email format');
    }

    const result = await db.query(
      'SELECT id, email, password_hash, full_name, phone_number, is_verified, created_at FROM users WHERE email = $1',
      [data.email]
    );

    // Message same as register, to avoid information leakage
    if (result.rows.length === 0) {
      throw new AppError(401, 'Invalid email or password');
    }

    const user = result.rows[0];
    const isPasswordValid = await comparePassword(data.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    await auditService.logUserLogin(user.id, user.email, ipAddress);

    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        is_verified: user.is_verified,
        created_at: user.created_at,
      },
      token,
    };
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const result = await db.query(
      'SELECT id, email, full_name, phone_number, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}

export const authService = new AuthService();

