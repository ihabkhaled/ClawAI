import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegisterForm } from '@/hooks/auth/use-register-form';

const mocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('@/hooks/auth/use-register', () => ({
  useRegister: () => ({
    register: mocks.register,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useRegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits every registration field except confirmPassword', async () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.form.setValue('firstName', 'Ada');
      result.current.form.setValue('lastName', 'Lovelace');
      result.current.form.setValue('email', 'ada@example.com');
      result.current.form.setValue('phone', '+15551234567');
      result.current.form.setValue('password', 'Password1!');
      result.current.form.setValue('confirmPassword', 'Password1!');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(mocks.register).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+15551234567',
      password: 'Password1!',
    });
    expect(mocks.register.mock.calls[0]?.[0]).not.toHaveProperty('confirmPassword');
  });

  it('blocks submission when a required name is blank', async () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.form.setValue('firstName', ' ');
      result.current.form.setValue('lastName', 'Lovelace');
      result.current.form.setValue('email', 'ada@example.com');
      result.current.form.setValue('password', 'Password1!');
      result.current.form.setValue('confirmPassword', 'Password1!');
    });

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(mocks.register).not.toHaveBeenCalled();
  });
});
