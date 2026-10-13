import type { JsonSchemaIssue } from '../../../common/enums/json-schema-issue.enum';

export type WalkState = { nodes: number; issues: Set<JsonSchemaIssue> };
