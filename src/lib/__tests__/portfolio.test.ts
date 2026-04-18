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
