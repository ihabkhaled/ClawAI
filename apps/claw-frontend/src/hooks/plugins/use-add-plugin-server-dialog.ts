import { useState } from 'react';

import { PLUGIN_SERVER_DEFAULT_HEADER_NAME } from '@/constants/plugin-servers.constants';
import { PluginServerDialogStep } from '@/enums/plugin-server-dialog-step.enum';
import { useTranslation } from '@/lib/i18n';
import type {
  PluginServerFormValues,
  PluginServerView,
  UseAddPluginServerDialogReturn,
} from '@/types/plugin-servers.types';
import {
  buildCreateServerRequest,
  isHttpsUrl,
  pluginServerErrorKey,
} from '@/utilities/plugin-servers.utility';

import { useCreatePluginServer } from './use-create-plugin-server';

const EMPTY_VALUES: PluginServerFormValues = {
  name: '',
  url: '',
  headerName: PLUGIN_SERVER_DEFAULT_HEADER_NAME,
  headerValue: '',
  acknowledged: false,
};

/**
 * The Add server dialog: the form (name, https address, optional header key, risk consent), then
 * the tools step once the backend has accepted the server. Nothing is sent until the user ticks
 * the consent box, and the key is dropped from state as soon as it is sent.
 */
export function useAddPluginServerDialog(onClose: () => void): UseAddPluginServerDialogReturn {
  const { t } = useTranslation();
  const create = useCreatePluginServer();
  const [values, setValues] = useState<PluginServerFormValues>(EMPTY_VALUES);
  const [created, setCreated] = useState<PluginServerView | undefined>(undefined);

  const canSubmit =
    values.name.trim() !== '' && isHttpsUrl(values.url) && values.acknowledged && !create.isPending;

  return {
    step: created === undefined ? PluginServerDialogStep.Form : PluginServerDialogStep.Tools,
    values,
    setValue: (key, value) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    canSubmit,
    isSubmitting: create.isPending,
    submit: () => {
      if (!canSubmit) {
        return;
      }
      create.mutate(buildCreateServerRequest(values), {
        onSuccess: (server) => {
          setValues((current) => ({ ...current, headerValue: '' }));
          if (server === undefined) {
            onClose();
          } else {
            setCreated(server);
          }
        },
      });
    },
    errorMessage: create.error === null ? null : t(pluginServerErrorKey(create.error)),
    created,
  };
}
