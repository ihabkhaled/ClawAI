import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRegisterForm } from '@/hooks/auth/use-register-form';
import { ApiClientError } from '@/services/shared/api-client';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  state: { isError: false, error: null as unknown },
}));

vi.mock('@/hooks/auth/use-register', () => ({
  useRegister: () => ({
    register: mocks.register,
    isPending: false,
    isError: mocks.state.isError,
    error: mocks.state.error,
  }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('useRegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state = { isError: false, error: null };
  });

  function fail(error: ApiClientError): void {
    mocks.state = { isError: true, error };
  }

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

  it('has no failure copy while nothing has failed', () => {
    const { result } = renderHook(() => useRegisterForm());
    expect(result.current.failureCopy).toBeNull();
    expect(result.current.requestId).toBeNull();
  });

  it('explains a taken address with sign-in and reset, and no request reference', () => {
    fail(
      new ApiClientError({ message: 'x', status: 409, code: 'DUPLICATE_ENTITY', requestId: 'r1' }),
    );
    const { result } = renderHook(() => useRegisterForm());
    expect(result.current.failureCopy).toMatchObject({
      titleKey: 'auth.signup.emailTakenTitle',
      offersSignIn: true,
    });
    expect(result.current.requestId).toBeNull();
  });

  it('exposes the request reference for an unknown 5xx', () => {
    fail(new ApiClientError({ message: 'x', status: 500, requestId: 'req-42' }));
    const { result } = renderHook(() => useRegisterForm());
    expect(result.current.failureCopy?.titleKey).toBe('auth.signup.unknownTitle');
    expect(result.current.requestId).toBe('req-42');
  });

  it('pins server field errors to their fields as translatable keys', () => {
    fail(
      new ApiClientError({
        message: 'Validation failed',
        status: 400,
        code: 'VALIDATION_FAILED',
        errors: { email: ['EMAIL_INVALID'], phone: ['PHONE_INVALID'] },
      }),
    );
    const { result } = renderHook(() => useRegisterForm());
    expect(result.current.form.formState.errors.email?.message).toBe('auth.signup.emailInvalid');
    expect(result.current.phoneServerErrorKey).toBe('auth.signup.phoneInvalid');
  });

  it('reports the live state of the password rules', () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.form.setValue('password', 'abcdefgh');
    });
    const met = result.current.passwordRules.filter((rule) => rule.isMet).map((rule) => rule.id);
    expect(met).toEqual(['length', 'lowercase']);
  });
});
