// View mode for the cross-provider Models page (apps/claw-frontend/src/app/
// (portal)/models/page.tsx). The user can switch between a dense data-table
// view and a card-grid view; the selection is persisted to localStorage so
// the choice survives reloads.
export enum ModelCatalogViewMode {
  TABLE = 'TABLE',
  GRID = 'GRID',
}
