import { describe, it, expect } from 'vitest';
import { computeSymbolChart, computeOverallChart } from '../portfolio';

describe('Portfolio Utils', () => {
  describe('computeSymbolChart', () => {
    it('computes basic chart points for single symbol', () => {
      const transactions = [
        { symbol: 'AAPL', type: 'BUY', date: new Date('2024-01-01'), quantity: 10, unitPrice: 100, fee: 5 },
      ];
      const priceHistory = [
        { symbol: 'AAPL', instrumentProvider: 'YAHOO', currency: 'USD', date: new Date('2024-01-05'), close: 110, id: '1', createdAt: new Date() },
        { symbol: 'AAPL', instrumentProvider: 'YAHOO', currency: 'USD', date: new Date('2024-01-12'), close: 120, id: '2', createdAt: new Date() },
      ];

      const chart = computeSymbolChart(transactions, priceHistory);
      
      expect(chart).toHaveLength(2);
      expect(chart[0].date).toBe('2024-01-05');
      // cost: 10 * 100 + 5 = 1005
      // value on week 1: 10 * 110 = 1100
      expect(chart[0].cost).toBe(1005);
      expect(chart[0].value).toBe(1100);

      // value on week 2: 10 * 120 = 1200
      expect(chart[1].value).toBe(1200);
    });

    it('correctly sorts transactions and handles SELL proportional cost deduction', () => {
      // Mock transactions fed in random/descending order
      const transactions = [
        { symbol: 'AAPL', type: 'SELL', date: new Date('2024-02-01'), quantity: 5, unitPrice: 150, fee: 2 },
        { symbol: 'AAPL', type: 'BUY', date: new Date('2024-01-10'), quantity: 5, unitPrice: 110, fee: 0 },
        { symbol: 'AAPL', type: 'BUY', date: new Date('2024-01-01'), quantity: 5, unitPrice: 90, fee: 0 },
      ];

      const priceHistory = [
        { symbol: 'AAPL', instrumentProvider: 'YAHOO', currency: 'USD', date: new Date('2024-02-05'), close: 160, id: '1', createdAt: new Date() },
      ];

      const chart = computeSymbolChart(transactions, priceHistory);
      
      // Breakdown of chronology inside the loop:
      // Jan 1: BUY 5 @ 90 = $450 cost (shares: 5)
      // Jan 10: BUY 5 @ 110 = $550 cost (cumulative cost: $1000, shares: 10)
      // Feb 1: SELL 5. Avg Cost = $1000 / 10 = $100.
      // Proportional deduction: 5 * 100 = $500. Remaining cost: $500.
      
      expect(chart).toHaveLength(1);
      expect(chart[0].cost).toBe(500); // Cost basis is accurately $500!
      expect(chart[0].value).toBe(5 * 160); // Remaining 5 shares * $160
    });
  });

  describe('computeOverallChart', () => {
    it('computes portfolio chart points applying FX rates and summing properties', () => {
      const transactions = [
        { symbol: 'AAPL', type: 'BUY', date: new Date('2024-01-01'), quantity: 10, unitPrice: 100, fee: 0, accountCurrency: 'USD' },
        { symbol: 'SHOP', type: 'BUY', date: new Date('2024-01-01'), quantity: 5, unitPrice: 50, fee: 0, accountCurrency: 'CAD' },
      ];

      const priceHistoryMap = new Map();
      priceHistoryMap.set('AAPL', [
        { symbol: 'AAPL', currency: 'USD', date: new Date('2024-01-08'), close: 150, id: '1', createdAt: new Date() },
      ]);
      priceHistoryMap.set('SHOP', [
        { symbol: 'SHOP', currency: 'CAD', date: new Date('2024-01-08'), close: 60, id: '2', createdAt: new Date() },
      ]);

      const fxRates = new Map([
        ['CAD', 0.75],
        ['USD', 1],
      ]);

      const chart = computeOverallChart(transactions, priceHistoryMap, fxRates);
      
      expect(chart).toHaveLength(1);
      // Cost: 
      // AAPL in USD = (10*100) * 1 = 1000
      // SHOP in CAD = (5*50) * 0.75 = 250*0.75 = 187.5
      // Total cost = 1187.5
      expect(chart[0].cost).toBe(1187.5);

      // Value:
      // AAPL value = 10*150 * 1 = 1500
      // SHOP value = 5*60 * 0.75 = 300*0.75 = 225
      // Total value = 1725
      expect(chart[0].value).toBe(1725);
    });
  });
});
