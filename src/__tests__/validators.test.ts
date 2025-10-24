import { isValidEmail, isValidPassword, isValidPhoneNumber, isValidAmount } from '../utils/validators';

describe('Validators', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return true for valid password', () => {
      expect(isValidPassword('password123')).toBe(true);
      expect(isValidPassword('12345678')).toBe(true);
    });

    it('should return false for invalid password', () => {
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('1234567')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone number', () => {
      expect(isValidPhoneNumber('+2348012345678')).toBe(true);
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
    });

    it('should return false for invalid phone number', () => {
      expect(isValidPhoneNumber('08012345678')).toBe(false);
      expect(isValidPhoneNumber('abc')).toBe(false);
    });
  });

  describe('isValidAmount', () => {
    it('should return true for valid amount', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
    });

    it('should return false for invalid amount', () => {
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
    });
  });
});

