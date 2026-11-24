import type { LiveIntelligenceWaysTableProps } from '@/types/live-intelligence-marketing.types';

/** Live analysis and the one-click summary compared row by row. Scrolls in its own box on a phone. */
export function LiveIntelligenceWaysTable({
  caption,
  aspect,
  live,
  summary,
  rows,
}: LiveIntelligenceWaysTableProps): React.ReactElement {
  return (
    <div className="editorial-comparison__table-scroll">
      <table className="editorial-comparison__table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{aspect}</th>
            <th scope="col">{live}</th>
            <th scope="col">{summary}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.live}</td>
              <td>{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
