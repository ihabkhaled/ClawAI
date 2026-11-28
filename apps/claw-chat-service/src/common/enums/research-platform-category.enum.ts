/**
 * The source kinds a research run can search (research-service's platform registry, B3). The council names the ones
 * that would actually hold the answer; the values are the wire contract with research-service.
 */
export enum ResearchPlatformCategory {
  NEWS = 'NEWS',
  ACADEMIC = 'ACADEMIC',
  TECHNICAL = 'TECHNICAL',
  SOCIAL = 'SOCIAL',
  VIDEO = 'VIDEO',
  FORUM = 'FORUM',
  OFFICIAL = 'OFFICIAL',
  REFERENCE = 'REFERENCE',
  COMMERCE = 'COMMERCE',
}
