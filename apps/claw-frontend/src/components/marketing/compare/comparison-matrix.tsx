import type { ComparisonMatrixProps } from '@/types/public-comparison.types';

/**
 * The eight-row capability table.
 *
 * A real `<table>` with a `<caption>` and `scope`d headers, not a grid of divs:
 * this is genuine tabular data, and it is the part of the page an assistant is
 * most likely to quote. A screen reader announces "Routing, ClawAI, five routing
 * modes" only if the row and column headers are marked as headers.
 *
 * The scroll wrapper is a labelled `region` so the table is reachable by landmark
 * navigation and announced with a name. It deliberately carries no `tabindex`:
 * current browsers make a scrollable container keyboard-focusable on their own,
 * and adding one by hand puts a non-interactive element in the tab order for
 * everyone else.
 */
export function ComparisonMatrix({
  caption,
  capabilityColumn,
  clawColumn,
  rivalColumn,
  rows,
}: ComparisonMatrixProps): React.ReactElement {
  return (
    <div className="editorial-comparison__table-scroll" role="region" aria-label={caption}>
      <table className="editorial-comparison__table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{capabilityColumn}</th>
            <th scope="col" className="editorial-comparison__claw-column">
              {clawColumn}
            </th>
            <th scope="col">{rivalColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension}>
              <th scope="row">{row.label}</th>
              <td className="editorial-comparison__claw-cell">{row.claw}</td>
              <td>{row.rival}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
