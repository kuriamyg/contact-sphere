import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/auth', () => ({ login: vi.fn() }));

const { LoginForm } = await import('@/components/auth/login-form');

describe('LoginForm', () => {
  it('has labelled fields that password managers understand', () => {
    render(<LoginForm />);
    const who = screen.getByLabelText('Email or phone number');
    const password = screen.getByLabelText('Password');
    expect(who).toHaveAttribute('autocomplete', 'username');
    // Text, not email: a phone number is a valid answer too (B6).
    expect(who).toHaveAttribute('type', 'text');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
