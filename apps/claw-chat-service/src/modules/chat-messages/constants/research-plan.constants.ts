/** A model-written sentence shown to the user; longer is the model rambling. */
export const PLANNER_NARRATION_MAX_CHARS = 300;

/** Search providers reject long queries; the planner is told under 12 words. */
export const PLANNER_QUERY_MAX_CHARS = 200;

/** The planner's visible thinking; a few sentences, never an essay. */
export const PLANNER_THINKING_MAX_CHARS = 800;
