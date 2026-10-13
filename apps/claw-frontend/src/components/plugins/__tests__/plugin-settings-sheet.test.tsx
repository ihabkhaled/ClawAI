import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PluginConsentList } from '@/components/plugins/plugin-consent-list';
import { PluginCredentialSection } from '@/components/plugins/plugin-credential-section';
import { PluginSettingsField } from '@/components/plugins/plugin-settings-field';
import { PluginSettingsForm } from '@/components/plugins/plugin-settings-form';
import { PluginSettingsSheet } from '@/components/plugins/plugin-settings-sheet';
import { PluginRiskLevel } from '@/enums/plugin-risk-level.enum';
import { PluginSettingsFieldKind } from '@/enums/plugin-settings-field-kind.enum';
import { usePluginSettingsSheet } from '@/hooks/plugins/use-plugin-settings-sheet';
import type {
  PluginSettingsField as SettingsFieldModel,
  UsePluginSettingsSheetReturn,
} from '@/types/plugin-installs.types';

import { installView, pluginDetail, tStub } from './plugins-fixtures';

vi.mock('@/hooks/plugins/use-plugin-settings-sheet');

const mockSheet = vi.mocked(usePluginSettingsSheet);

function field(overrides: Partial<SettingsFieldModel> = {}): SettingsFieldModel {
  return {
    key: 'city',
    kind: PluginSettingsFieldKind.Text,
    label: 'City',
    description: '',
    required: false,
    options: [],
    min: undefined,
    max: undefined,
    minLength: undefined,
    maxLength: undefined,
    integer: false,
    fallback: '',
    ...overrides,
  };
}

function sheetState(
  overrides: Partial<UsePluginSettingsSheetReturn> = {},
): UsePluginSettingsSheetReturn {
  return {
    t: tStub,
    plugin: pluginDetail(),
    isLoading: false,
    fields: [],
    draft: {},
    errors: {},
    setDraftValue: () => undefined,
    save: () => undefined,
    isSaving: false,
    credentialDraft: '',
    setCredentialDraft: () => undefined,
    saveCredential: () => undefined,
    removeCredential: () => undefined,
    isCredentialBusy: false,
    grantConsent: () => undefined,
    revokeConsent: () => undefined,
    isConsentBusy: false,
    errorMessage: null,
    ...overrides,
  };
}

const WRITE_TOOL = {
  name: 'send_mail',
  title: 'Send mail',
  description: 'Sends an email.',
  riskLevel: PluginRiskLevel.Write,
};
const DESTRUCTIVE_TOOL = {
  name: 'delete_all',
  title: 'Delete everything',
  description: 'Deletes.',
  riskLevel: PluginRiskLevel.Destructive,
};
const READ_TOOL = {
  name: 'read_inbox',
  title: 'Read inbox',
  description: 'Reads.',
  riskLevel: PluginRiskLevel.Read,
};

describe('PluginSettingsField', () => {
  it('draws a text input and reports edits', () => {
    const onChange = vi.fn();
    render(
      <PluginSettingsField
        field={field()}
        value="Cairo"
        error={undefined}
        onChange={onChange}
        t={tStub}
      />,
    );
    const input = screen.getByLabelText('City');
    expect((input as HTMLInputElement).value).toBe('Cairo');
    expect(input.getAttribute('type')).toBe('text');
    fireEvent.change(input, { target: { value: 'Giza' } });
    expect(onChange).toHaveBeenCalledWith('city', 'Giza');
  });

  it('draws a number input with its bounds', () => {
    render(
      <PluginSettingsField
        field={field({
          kind: PluginSettingsFieldKind.Number,
          key: 'days',
          label: 'Days',
          min: 1,
          max: 7,
        })}
        value="3"
        error={undefined}
        onChange={() => undefined}
        t={tStub}
      />,
    );
    const input = screen.getByLabelText('Days');
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('7');
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('uses the digits keyboard for an integer field and the schema text length limits', () => {
    render(
      <>
        <PluginSettingsField
          field={field({
            kind: PluginSettingsFieldKind.Number,
            key: 'days',
            label: 'Days',
            integer: true,
          })}
          value="3"
          error={undefined}
          onChange={() => undefined}
          t={tStub}
        />
        <PluginSettingsField
          field={field({ minLength: 3, maxLength: 8 })}
          value="Cairo"
          error={undefined}
          onChange={() => undefined}
          t={tStub}
        />
      </>,
    );
    expect(screen.getByLabelText('Days').getAttribute('inputmode')).toBe('numeric');
    const city = screen.getByLabelText('City');
    expect(city.getAttribute('minlength')).toBe('3');
    expect(city.getAttribute('maxlength')).toBe('8');
  });

  it('draws a switch for a boolean and reports the new value', () => {
    const onChange = vi.fn();
    render(
      <PluginSettingsField
        field={field({ kind: PluginSettingsFieldKind.Boolean, key: 'compact', label: 'Compact' })}
        value
        error={undefined}
        onChange={onChange}
        t={tStub}
      />,
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith('compact', false);
  });

  it('draws a select with the current choice', () => {
    render(
      <PluginSettingsField
        field={field({
          kind: PluginSettingsFieldKind.Select,
          key: 'units',
          label: 'Units',
          options: ['metric', 'imperial'],
        })}
        value="metric"
        error={undefined}
        onChange={() => undefined}
        t={tStub}
      />,
    );
    expect(screen.getByRole('combobox').textContent).toContain('metric');
  });

  it('shows the description and a translated error tied to the input', () => {
    render(
      <PluginSettingsField
        field={field({ description: 'Home city', min: 1, max: 9 })}
        value=""
        error="pluginsInstall.validation.range"
        onChange={() => undefined}
        t={tStub}
      />,
    );
    expect(screen.getByText('Home city')).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('pluginsInstall.validation.range|1,9');
    const input = screen.getByLabelText('City');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });
});

describe('PluginSettingsForm', () => {
  it('says so when the plugin has no settings', () => {
    render(
      <PluginSettingsForm
        fields={[]}
        draft={{}}
        errors={{}}
        onChange={() => undefined}
        t={tStub}
      />,
    );
    expect(screen.getByText('pluginsInstall.sheet.settingsNone')).toBeTruthy();
  });

  it('renders each field with its draft value, falling back to empty', () => {
    render(
      <PluginSettingsForm
        fields={[field(), field({ key: 'zip', label: 'Zip' })]}
        draft={{ city: 'Cairo' }}
        errors={{ zip: 'pluginsInstall.validation.required' }}
        onChange={() => undefined}
        t={tStub}
      />,
    );
    expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Cairo');
    expect((screen.getByLabelText('Zip') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});

describe('PluginConsentList', () => {
  const handlers = () => ({ onGrant: vi.fn(), onRevoke: vi.fn() });

  it('says so when there are no tools', () => {
    const h = handlers();
    render(<PluginConsentList tools={[]} install={installView()} busy={false} t={tStub} {...h} />);
    expect(screen.getByText('pluginsInstall.sheet.consentsNone')).toBeTruthy();
  });

  it('needs no permission for a read tool, and grants a write tool at its own level', () => {
    const h = handlers();
    render(
      <PluginConsentList
        tools={[READ_TOOL, WRITE_TOOL]}
        install={installView()}
        busy={false}
        t={tStub}
        {...h}
      />,
    );
    expect(screen.getByText('pluginsInstall.sheet.consentReadNote')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.sheet.consentGrant' }));
    expect(h.onGrant).toHaveBeenCalledWith('send_mail', 'WRITE');
  });

  it('revokes a granted consent and shows it as allowed', () => {
    const h = handlers();
    const install = installView({
      consents: [{ toolName: 'send_mail', level: 'WRITE', grantedAt: '2026-10-13T00:00:00Z' }],
    });
    render(
      <PluginConsentList tools={[WRITE_TOOL]} install={install} busy={false} t={tStub} {...h} />,
    );
    expect(screen.getByText('pluginsInstall.sheet.consentGranted')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.sheet.consentRevoke' }));
    expect(h.onRevoke).toHaveBeenCalledWith('send_mail');
    expect(screen.queryByRole('button', { name: 'pluginsInstall.sheet.consentGrant' })).toBeNull();
  });

  it('grants a destructive tool at its level and warns that it still asks every time', () => {
    const h = handlers();
    render(
      <PluginConsentList
        tools={[DESTRUCTIVE_TOOL]}
        install={installView()}
        busy
        t={tStub}
        {...h}
      />,
    );
    expect(screen.getByText('pluginsInstall.sheet.consentDestructiveNote')).toBeTruthy();
    const button = screen.getByRole('button', { name: 'pluginsInstall.sheet.consentGrant' });
    expect(button).toBeDisabled();
  });

  it('grants a destructive tool with the DESTRUCTIVE level when not busy', () => {
    const h = handlers();
    render(
      <PluginConsentList
        tools={[DESTRUCTIVE_TOOL]}
        install={installView()}
        busy={false}
        t={tStub}
        {...h}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.sheet.consentGrant' }));
    expect(h.onGrant).toHaveBeenCalledWith('delete_all', 'DESTRUCTIVE');
  });
});

describe('PluginCredentialSection', () => {
  it('offers Save only once a key is typed, and no Remove when none is stored', () => {
    const saveCredential = vi.fn();
    const { rerender } = render(
      <PluginCredentialSection
        install={installView({ authKind: 'API_KEY' })}
        sheet={sheetState({ saveCredential })}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'pluginsInstall.sheet.credentialSave' }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'pluginsInstall.sheet.credentialRemove' }),
    ).toBeNull();
    rerender(
      <PluginCredentialSection
        install={installView({ authKind: 'API_KEY' })}
        sheet={sheetState({ saveCredential, credentialDraft: 'k' })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.sheet.credentialSave' }));
    expect(saveCredential).toHaveBeenCalledTimes(1);
  });

  it('replaces or removes a stored key and never shows it', () => {
    const removeCredential = vi.fn();
    render(
      <PluginCredentialSection
        install={installView({
          authKind: 'API_KEY',
          credential: { hasCredential: true, kind: 'API_KEY', updatedAt: null },
        })}
        sheet={sheetState({ removeCredential, credentialDraft: 'new' })}
      />,
    );
    expect(screen.getByText('pluginsInstall.credential.saved')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'pluginsInstall.sheet.credentialReplace' }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'pluginsInstall.sheet.credentialRemove' }));
    expect(removeCredential).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while a key call is running', () => {
    render(
      <PluginCredentialSection
        install={installView({
          authKind: 'API_KEY',
          credential: { hasCredential: true, kind: 'API_KEY', updatedAt: null },
        })}
        sheet={sheetState({ isCredentialBusy: true, credentialDraft: 'x' })}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'pluginsInstall.sheet.credentialReplace' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'pluginsInstall.sheet.credentialRemove' }),
    ).toBeDisabled();
  });
});

describe('PluginSettingsSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows settings, consent and no key section for a keyless plugin', () => {
    const save = vi.fn();
    mockSheet.mockReturnValue(
      sheetState({
        fields: [field()],
        draft: { city: 'Cairo' },
        save,
        plugin: pluginDetail({ tools: [WRITE_TOOL] }),
      }),
    );
    render(<PluginSettingsSheet install={installView()} onClose={() => undefined} />);
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('pluginsInstall.sheet.title|Web fetch')).toBeTruthy();
    expect(dialog.getByLabelText('City')).toBeTruthy();
    expect(dialog.getByText('Send mail')).toBeTruthy();
    expect(dialog.queryByText('pluginsInstall.sheet.credentialTitle')).toBeNull();
    fireEvent.click(dialog.getByRole('button', { name: 'pluginsInstall.sheet.save' }));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('shows the key section for an API-key plugin and no Save without fields', () => {
    mockSheet.mockReturnValue(sheetState());
    render(
      <PluginSettingsSheet
        install={installView({ authKind: 'API_KEY' })}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText('pluginsInstall.sheet.credentialTitle')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'pluginsInstall.sheet.save' })).toBeNull();
    expect(screen.getByText('pluginsInstall.sheet.settingsNone')).toBeTruthy();
  });

  it('shows an error, a loading skeleton and no consent rows before the entry loads', () => {
    mockSheet.mockReturnValue(
      sheetState({ plugin: undefined, isLoading: true, errorMessage: 'Nope' }),
    );
    render(<PluginSettingsSheet install={installView()} onClose={() => undefined} />);
    expect(screen.getByText('Nope')).toBeTruthy();
    expect(screen.getByText('pluginsInstall.sheet.consentsNone')).toBeTruthy();
  });

  it('closes through the dialog close control', () => {
    const onClose = vi.fn();
    mockSheet.mockReturnValue(sheetState());
    render(<PluginSettingsSheet install={installView()} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
