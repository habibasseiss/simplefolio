import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TransactionForm } from '../transaction-form';

// Mock SymbolCombobox so we don't have to deal with Command dialog internals
vi.mock('@/components/symbol-combobox', () => ({
  SymbolCombobox: ({ defaultValue }: { defaultValue?: string }) => (
    <input data-testid="symbol-combobox" name="symbol" defaultValue={defaultValue} />
  )
}));

describe('TransactionForm', () => {
  it('renders common fields', () => {
    render(<TransactionForm action={vi.fn()} />);
    
    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unit Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fee/i)).toBeInTheDocument();
  });

  it('shows DRIP option when type is BUY', async () => {
    const user = userEvent.setup();
    render(<TransactionForm action={vi.fn()} />);
    
    expect(screen.getByLabelText(/Reinvest dividends/i)).toBeInTheDocument();
    
    await user.selectOptions(screen.getByLabelText(/Type/i), 'SELL');
    expect(screen.queryByLabelText(/Reinvest dividends/i)).not.toBeInTheDocument();
  });

  it('shows NRA tax option when type is DIVIDEND and nraTaxRate is provided', async () => {
    const user = userEvent.setup();
    render(<TransactionForm action={vi.fn()} nraTaxRate={0.15} />);
    
    // Switch to DIVIDEND
    await user.selectOptions(screen.getByLabelText(/Type/i), 'DIVIDEND');
    
    expect(screen.getByLabelText(/Apply NRA tax withholding \(15%\)/i)).toBeInTheDocument();
  });

  it('submits correctly', async () => {
    const mockAction = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    
    render(<TransactionForm action={mockAction} />);
    
    await user.selectOptions(screen.getByLabelText(/Type/i), 'BUY');
    await user.type(screen.getByTestId('symbol-combobox'), 'TSLA');
    await user.type(screen.getByLabelText(/Date/i), '2024-03-01');
    await user.type(screen.getByLabelText(/Quantity/i), '5');
    await user.type(screen.getByLabelText(/Unit Price/i), '200');
    
    await user.click(screen.getByRole('button', { name: /Save/i }));
    
    expect(mockAction).toHaveBeenCalled();
    const formData = mockAction.mock.calls[0][1] as FormData;
    expect(formData.get('type')).toBe('BUY');
    expect(formData.get('symbol')).toBe('TSLA');
    expect(formData.get('quantity')).toBe('5');
    expect(formData.get('unitPrice')).toBe('200');
  });
});
