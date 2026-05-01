export type RecipeExpressionContext = {
  params: Record<string, unknown>;
  steps: Record<string, { output: Record<string, unknown> }>;
};

export type RecipeToken =
  | { kind: 'PATH'; segments: string[] }
  | { kind: 'STRING'; value: string }
  | { kind: 'NUMBER'; value: number }
  | { kind: 'BOOLEAN'; value: boolean }
  | { kind: 'NULL' }
  | {
      kind: 'OPERATOR';
      op: '==' | '!=' | '===' | '!==' | '>' | '>=' | '<' | '<=' | '&&' | '||' | '!' | '~=';
    }
  | { kind: 'PAREN'; value: '(' | ')' };

export type RecipeParserCursor = { i: number; tokens: RecipeToken[] };
