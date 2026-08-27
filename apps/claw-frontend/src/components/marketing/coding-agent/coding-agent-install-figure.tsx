import { ExtensionsViewFigure } from '@/components/marketing/coding-agent/figures/extensions-view-figure';
import { InstallAndSignInFigure } from '@/components/marketing/coding-agent/figures/install-and-sign-in-figure';
import { SearchResultFigure } from '@/components/marketing/coding-agent/figures/search-result-figure';
import { CodingAgentInstallFigure as Figure } from '@/enums/coding-agent-install-figure.enum';
import type { CodingAgentInstallFigureProps } from '@/types';

/**
 * Picks the illustration for one install step.
 *
 * Returns null for a step with no figure rather than falling back to a generic
 * one: a picture that does not match the sentence beside it is worse than no
 * picture, because the reader trusts it.
 */
export function CodingAgentInstallFigure({
  figure,
  label,
}: CodingAgentInstallFigureProps): React.ReactElement | null {
  if (!figure) {
    return null;
  }

  return (
    <figure className="editorial-figure" role="img" aria-label={label}>
      {figure === Figure.EXTENSIONS_VIEW ? <ExtensionsViewFigure /> : null}
      {figure === Figure.SEARCH_RESULT ? <SearchResultFigure /> : null}
      {figure === Figure.INSTALL_AND_SIGN_IN ? <InstallAndSignInFigure /> : null}
    </figure>
  );
}
