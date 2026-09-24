/**
 * Modality string the models snapshot emits for native video input.
 *
 * Must be a member of routing-service's Prisma `ModalityKind` enum
 * (`VIDEO_INPUT`) — routing-service writes `modalitiesIn` straight into that
 * enum column, so any other spelling makes the row's upsert throw.
 */
export const SNAPSHOT_VIDEO_INPUT_MODALITY = 'VIDEO_INPUT';
