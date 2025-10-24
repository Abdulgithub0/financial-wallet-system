// Mock uuid module before importing
jest.mock('uuid', () => ({
  v4: () => '12345678-1234-1234-1234-123456789abc'
}));

import { generateTransactionReference } from '../utils/reference';

describe('Reference Generator', () => {
  describe('generateTransactionReference', () => {
    it('should generate a unique reference', () => {
      const ref1 = generateTransactionReference();
      const ref2 = generateTransactionReference();

      expect(ref1).toBeDefined();
      expect(ref2).toBeDefined();
      // References will differ by timestamp, counter and random part
      expect(ref1).toMatch(/^TXN-\d+-\d{3}-[A-F0-9]+$/);
    });

    it('should start with TXN- prefix', () => {
      const ref = generateTransactionReference();
      expect(ref.startsWith('TXN-')).toBe(true);
    });

    it('should be uppercase', () => {
      const ref = generateTransactionReference();
      expect(ref).toBe(ref.toUpperCase());
    });
  });
});

