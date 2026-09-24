import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectorAuthType, ConnectorProvider } from '@/enums';
import { useConnectorFormState } from '@/hooks/connectors/use-connector-form-state';

describe('useConnectorFormState — preset prefill on provider select', () => {
  it('prefills name, base URL and auth type from a preset when name is empty', () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useConnectorFormState({ open: true, connector: null, onSubmit, onOpenChange }),
    );

    act(() => {
      result.current.onProviderSelect(ConnectorProvider.GROQ);
    });

    expect(result.current.provider).toBe(ConnectorProvider.GROQ);
    expect(result.current.name).toBe('Groq');
    expect(result.current.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(result.current.authType).toBe(ConnectorAuthType.API_KEY);
    expect(result.current.selectedPreset?.key).toBe(ConnectorProvider.GROQ);
  });

  it('does not overwrite a name the admin already typed', () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useConnectorFormState({ open: true, connector: null, onSubmit, onOpenChange }),
    );

    act(() => {
      result.current.setName('My custom connector name');
    });
    act(() => {
      result.current.onProviderSelect(ConnectorProvider.MISTRAL);
    });

    expect(result.current.name).toBe('My custom connector name');
    expect(result.current.baseUrl).toBe('https://api.mistral.ai/v1');
  });

  it('leaves the base URL alone after selection — it stays editable', () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useConnectorFormState({ open: true, connector: null, onSubmit, onOpenChange }),
    );

    act(() => {
      result.current.onProviderSelect(ConnectorProvider.TOGETHER);
    });
    act(() => {
      result.current.setBaseUrl('https://my-proxy.example.com/v1');
    });

    expect(result.current.baseUrl).toBe('https://my-proxy.example.com/v1');
  });

  it('flags requiresAccountId only for Cloudflare and resets accountId on reselect', () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useConnectorFormState({ open: true, connector: null, onSubmit, onOpenChange }),
    );

    act(() => {
      result.current.onProviderSelect(ConnectorProvider.CLOUDFLARE);
    });
    expect(result.current.requiresAccountId).toBe(true);
    expect(result.current.baseUrl).toContain('{ACCOUNT_ID}');

    act(() => {
      result.current.setAccountId('0123456789abcdef0123456789abcdef');
    });
    expect(result.current.resolvedBaseUrlPreview).toContain('0123456789abcdef0123456789abcdef');
    expect(result.current.resolvedBaseUrlPreview).not.toContain('{ACCOUNT_ID}');

    act(() => {
      result.current.onProviderSelect(ConnectorProvider.OPENROUTER);
    });
    expect(result.current.requiresAccountId).toBe(false);
    expect(result.current.accountId).toBe('');
  });

  it('does not prefill name/base URL/auth type for a bespoke (non-preset) provider', () => {
    const onSubmit = vi.fn();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useConnectorFormState({ open: true, connector: null, onSubmit, onOpenChange }),
    );

    act(() => {
      result.current.onProviderSelect(ConnectorProvider.OPENAI);
    });

    expect(result.current.provider).toBe(ConnectorProvider.OPENAI);
    expect(result.current.name).toBe('');
    expect(result.current.baseUrl).toBe('');
    expect(result.current.selectedPreset).toBeUndefined();
  });
});
