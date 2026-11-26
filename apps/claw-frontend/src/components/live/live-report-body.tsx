import type { LiveReportBodyProps } from '@/types/live.types';
import { parseLiveReportBody } from '@/utilities/live-report.utility';

/** The detailed video report: a heading per section, each moment with its time on the start side. */
export function LiveReportBody({ body }: LiveReportBodyProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4" data-testid="live-report-body" dir="auto">
      {parseLiveReportBody(body).map((section, sectionIndex) => (
        <section key={`${section.title}-${String(sectionIndex)}`} className="flex flex-col gap-1.5">
          {section.title ? (
            <h4 className="text-foreground text-sm font-semibold">{section.title}</h4>
          ) : null}
          <ul className="flex flex-col gap-1">
            {section.lines.map((line, lineIndex) => (
              <li
                key={`${line.clock ?? 'p'}-${String(lineIndex)}`}
                className="text-foreground/90 flex gap-2 text-sm leading-relaxed"
              >
                {line.clock ? (
                  <span
                    className="text-primary shrink-0 font-mono text-xs leading-6 tabular-nums"
                    dir="ltr"
                  >
                    {line.clock}
                  </span>
                ) : null}
                <span className="min-w-0">{line.text}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
