import type {
  PublicThreadPublication,
  ThreadCommunityActionState,
  PublicThreadComment,
  ThreadReactionSummary,
} from '@/types/thread-publication.types';

export type ThreadReaderBodyProps = {
  markdown: string;
  citations: Array<{ url: string }>;
  truncatedLabel: string;
  citationsLabel: string;
};

export type BoardReaderController = {
  publication: PublicThreadPublication | undefined;
  comments: PublicThreadComment[];
  reactions: ThreadReactionSummary | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNotFound: boolean;
  isError: boolean;
  communityLoading: boolean;
  communityError: boolean;
  loginHref: string;
  publicUrl: string | null;
  publicPath: string;
  actions: ThreadCommunityActionState;
  goBack: () => void;
  retry: () => void;
};

export type BoardReaderActionsProps = {
  title: string;
  publicUrl: string | null;
  publicPath: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
};

export type BoardReaderViewProps = {
  state: BoardReaderController;
};
