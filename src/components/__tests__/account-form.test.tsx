import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AccountForm } from '../account-form';

describe('AccountForm', () => {
  it('renders default fields', () => {
    render(<AccountForm action={vi.fn()} />);
    
    expect(screen.getByLabelText(/Account Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const mockAction = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    
    render(<AccountForm action={mockAction} submitLabel="Create" />);
    
    await user.type(screen.getByLabelText(/Account Name/i), 'My New Savings');
    await user.selectOptions(screen.getByLabelText(/Currency/i), 'CAD');
    
    await user.click(screen.getByRole('button', { name: /Create/i }));
    
    expect(mockAction).toHaveBeenCalled();
    const formData = mockAction.mock.calls[0][1] as FormData;
    expect(formData.get('name')).toBe('My New Savings');
    expect(formData.get('currency')).toBe('CAD');
  });

  it('renders field errors if action returns them', async () => {
    // To test action state effectively with useActionState inside the component:
    // It's often easier to mock the initial state by simulating the exact error return, 
    // but in tests, React 19 useActionState will call the function.
    const mockAction = vi.fn().mockResolvedValue({
      fieldErrors: { name: ['Name is required'] }
    });
    
    const user = userEvent.setup();
    render(<AccountForm action={mockAction} />);
    
    // We intentionally submit without filling (browser validation might catch 'required', so we bypass or just type empty)
    // Wait, the input has `required` prop. So we need to remove it or use `user.click` on an empty form bypass.
    // Let's just assume the form submits with some data but the server rejects it.
    await user.type(screen.getByLabelText(/Account Name/i), 'A');
    await user.click(screen.getByRole('button', { name: /Save/i }));
    
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });
});
