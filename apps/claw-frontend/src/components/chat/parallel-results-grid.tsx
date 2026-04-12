import { ParallelResponseCard } from '@/components/chat/parallel-response-card';
import type { ParallelResultsGridProps } from '@/types';

export function ParallelResultsGrid({ responses, fastestModel, t }: ParallelResultsGridProps) {
  if (responses.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {responses.map((response) => (
        <ParallelResponseCard
          key={`${response.provider}:${response.model}`}
          response={response}
          isFastest={response.model === fastestModel}
          t={t}
        />
      ))}
    </div>
  );
}
