import { AudioGenerationCard } from '@/components/chat/audio-generation-card';
import { ImageGenerationBubble } from '@/components/chat/image-generation-bubble';
import { VideoGenerationBubble } from '@/components/chat/video-generation-bubble';
import { MediaGenerationKind } from '@/enums/media-generation-kind.enum';
import type { MediaGenerationView } from '@/types/media-generation.types';

/**
 * The cards for media a chat model made with a media tool, shown under its reply. Image and
 * video use the same bubble a router-made generation uses, keyed by the generation id, so
 * progress, retry and cancel behave identically; audio has its own card (polled, player,
 * download, retry). Cards render from stored message metadata, so a thread reload shows them.
 */
export function MediaGenerationCards({
  items,
}: {
  items: readonly MediaGenerationView[];
}): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 flex flex-col gap-2" data-testid="media-generation-cards">
      {items.map((item) => {
        if (item.kind === MediaGenerationKind.IMAGE) {
          return (
            <ImageGenerationBubble key={item.id} generationId={item.id} prompt={item.prompt} />
          );
        }
        if (item.kind === MediaGenerationKind.AUDIO) {
          return <AudioGenerationCard key={item.id} generationId={item.id} prompt={item.prompt} />;
        }
        return <VideoGenerationBubble key={item.id} generationId={item.id} prompt={item.prompt} />;
      })}
    </div>
  );
}
