import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatNumber } from '../format';

describe('Format Utils', () => {
  describe('formatDate', () => {
    it('formats a date into a localized string', () => {
      const date = new Date('2024-03-15T00:00:00Z');
      expect(formatDate(date)).toBe('Mar 15, 2024');
    });
  });

  describe('formatCurrency', () => {
    it('formats number as USD currency by default', () => {
      // Different node versions might differ in space characters for currencies
      const formatted = formatCurrency(1234.56).replace(/\s/g, '');
      expect(formatted).toContain('$1,234.56');
    });

    it('formats number with custom currency', () => {
      const formatted = formatCurrency(1234.56, 'BRL').replace(/\s/g, '');
      expect(formatted).toContain('R$1.234,56');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with 2 fraction digits by default', () => {
      expect(formatNumber(1234.5)).toBe('1,234.50');
      expect(formatNumber(1234.567)).toBe('1,234.57');
    });

    it('formats numbers with custom fraction digits', () => {
      expect(formatNumber(100, 0)).toBe('100');
      expect(formatNumber(100, 4)).toBe('100.0000');
    });
  });
});
