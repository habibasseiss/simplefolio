import { describe, it, expect } from 'vitest';
import { calcTransactionTotal } from '../transaction/transaction.utils';

describe('Transaction Utils', () => {
  describe('calcTransactionTotal', () => {
    it('calculates BUY totals correctly (quantity * unitPrice + fee)', () => {
      const tx = { type: 'BUY', quantity: 10, unitPrice: 150, fee: 9.99 };
      // 10 * 150 = 1500, + 9.99 = 1509.99
      expect(calcTransactionTotal(tx)).toBe(1509.99);
    });

    it('calculates SELL totals correctly (quantity * unitPrice - fee)', () => {
      const tx = { type: 'SELL', quantity: 5, unitPrice: 200, fee: 4.95 };
      // 5 * 200 = 1000, - 4.95 = 995.05
      expect(calcTransactionTotal(tx)).toBe(995.05);
    });

    it('calculates DIVIDEND totals correctly with nraTax (quantity * unitPrice * (1 - nraTax))', () => {
      const tx = { type: 'DIVIDEND', quantity: 100, unitPrice: 0.5, fee: 0, nraTax: 0.15 };
      // Gross = 100 * 0.5 = 50. Withholding = 15%. Net = 50 * 0.85 = 42.5
      expect(calcTransactionTotal(tx)).toBe(42.5);
    });

    it('calculates DIVIDEND totals correctly without nraTax (defaults to 0)', () => {
      const tx = { type: 'DIVIDEND', quantity: 100, unitPrice: 0.5, fee: 0 };
      // Gross = 100 * 0.5 = 50. Net = 50
      expect(calcTransactionTotal(tx)).toBe(50);
    });

    it('falls back to BUY logic for unknown transaction types', () => {
      const tx = { type: 'TRANSFER', quantity: 10, unitPrice: 100, fee: 5 };
      // 10 * 100 = 1000, + 5 = 1005
      expect(calcTransactionTotal(tx)).toBe(1005);
    });
  });
});
