import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/auth', () => ({ login: vi.fn() }));

const { LoginForm } = await import('@/components/auth/login-form');

describe('LoginForm', () => {
  it('has labelled fields that password managers understand', () => {
    render(<LoginForm />);
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    expect(email).toHaveAttribute('autocomplete', 'username');
    expect(email).toHaveAttribute('type', 'email');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
