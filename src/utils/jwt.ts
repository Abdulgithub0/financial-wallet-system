import { sign, verify, SignOptions }  from 'jsonwebtoken';
import { config } from '../config/env';
import { AuthPayload } from '../types';

export const generateToken = (payload: AuthPayload): string => {
  return sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as SignOptions);
};

export const verifyToken = (token: string): AuthPayload => {
  try {
    return verify(token, config.JWT_SECRET) as AuthPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

