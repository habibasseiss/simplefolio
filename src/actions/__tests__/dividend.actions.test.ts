import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importDividendsAction, importAllDividendsAction } from '../dividend.actions';
import * as txRepo from '@/repositories/transaction.repository';
import * as userRepo from '@/repositories/user.repository';
import * as finance from '@/lib/finance';
import { prisma } from '@/lib/prisma';

vi.mock('@/repositories/transaction.repository');
vi.mock('@/repositories/user.repository');
vi.mock('@/lib/finance');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    account: { findMany: vi.fn() },
    transaction: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    priceHistory: { findFirst: vi.fn() }
  }
}));

describe('Dividend Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue('user-1');
  });

  describe('importDividendsAction', () => {
    it('returns 0 if no dividends fetched', async () => {
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await importDividendsAction('AAPL');
      expect(result).toEqual({ inserted: 0, skipped: 0, error: 'No dividend data found for AAPL' });
    });

    it('returns error if API call fails', async () => {
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      const result = await importDividendsAction('AAPL');
      expect(result.error).toBe('Failed to fetch dividends');
    });

    it('processes dividends and uses pricehistory for DRIP', async () => {
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockResolvedValue([
          { amount: 1.5, exDividendDate: '2024-03-01', paymentDate: '2024-03-15' }
        ]),
      } as any);

      // Mock an account holding 100 shares of AAPL that reinvests dividends
      vi.mocked(prisma.account.findMany).mockResolvedValue([{
        id: 'acc-1',
        transactions: [
          { type: 'BUY', symbol: 'AAPL', date: new Date('2024-01-01'), quantity: 100, reinvestDividends: true }
        ]
      }] as any);

      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null); // no existing dividend
      vi.mocked(prisma.priceHistory.findFirst).mockResolvedValue({ close: 150 } as any);

      const result = await importDividendsAction('AAPL');
      
      expect(result.inserted).toBe(1);
      // It should create the dividend itself
      expect(prisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'DIVIDEND', symbol: 'AAPL', quantity: 100, unitPrice: 1.5 })
      }));
      // It should create the DRIP buy
      expect(prisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'BUY', isDrip: true, symbol: 'AAPL' })
      }));
    });
  });

  describe('importAllDividendsAction', () => {
    it('aggregates results across symbols', async () => {
      vi.mocked(txRepo.findAllSymbols).mockResolvedValue(['AAPL', 'SHOP']);
      
      // Override importDividends internally or just mock the dependencies
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await importAllDividendsAction();
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].symbol).toBe('AAPL');
      expect(result.errors[1].symbol).toBe('SHOP');
    });
  });
});
