/** How an owner applies an accepted reader suggestion. */
export enum ThreadChangeAcceptMode {
  /** Send the revised article through the capped automatic review (the existing revision flow). */
  AiReview = 'AI_REVIEW',
  /** Accept now and edit the article in the editor; publishing it marks the suggestion applied. */
  EditMyself = 'EDIT_MYSELF',
}
