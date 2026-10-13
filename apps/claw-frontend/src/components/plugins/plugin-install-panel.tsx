import { usePluginInstallPanel } from '@/hooks/plugins/use-plugin-install-panel';
import type { PluginInstallPanelProps } from '@/types/plugin-installs.types';

import { PluginInstallButton } from './plugin-install-button';
import { PluginInstallDialog } from './plugin-install-dialog';

/** The install control on the detail page: the button (or the install's state) and the review dialog. */
export function PluginInstallPanel({ plugin }: PluginInstallPanelProps): React.ReactElement {
  const panel = usePluginInstallPanel(plugin);
  return (
    <>
      <PluginInstallButton
        gate={panel.gate}
        install={panel.install}
        limit={panel.limit}
        onOpen={panel.openDialog}
        t={panel.t}
      />
      <PluginInstallDialog plugin={plugin} panel={panel} />
    </>
  );
}
