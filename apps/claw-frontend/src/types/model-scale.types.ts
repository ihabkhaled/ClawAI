// How big a model is, shown beside its name in every model list (ADR-234).

/** One row of `GET /routing/model-sizes`: the size columns of a registry model. */
export type ModelSizeEntry = {
  provider: string;
  modelKey: string;
  /** Context window in tokens; null when nobody published one. */
  contextWindowTokens: number | null;
  /** Total parameters in billions (0.5 = 500M, 1000 = 1T); null for a closed model. */
  parameterCountBillions: number | null;
  /** Per-token share of a mixture-of-experts model, in billions; null for a dense or unknown one. */
  activeParameterCountBillions: number | null;
};

export type ModelSizeCatalogResponse = {
  data: ModelSizeEntry[];
};

/** The size of one model, with every part optional: an unknown part is simply not shown. */
export type ModelScale = {
  contextTokens: number | null;
  parameterBillions: number | null;
  activeParameterBillions: number | null;
};

/** Finds the size of a model by the provider and id a picker row carries. */
export type ModelSizeLookup = (
  provider: string,
  ...modelKeys: readonly string[]
) => ModelSizeEntry | undefined;

export type UseModelSizesResult = {
  lookup: ModelSizeLookup;
  isLoading: boolean;
};

export type ModelScaleLineProps = {
  provider: string;
  modelKey: string;
  contextTokens: number | null;
};

/** What a list that is not a picker (the connector model table, the model cards) needs to show a size. */
export type UseModelScaleFormatterResult = {
  /** "1M context · 750B params" for one model; undefined when nothing about its size is known. */
  scaleText: (
    provider: string,
    modelKey: string,
    contextTokens?: number | null,
  ) => ModelScaleText | undefined;
  /** "750B" for one model, or null when the maker publishes no count. */
  parameterLabel: (provider: string, modelKey: string) => string | null;
  /** The column heading, translated. */
  parametersHeading: string;
};

/** The translated pieces a scale label is built from (the `modelScale` dictionary). */
export type ModelScaleLocaleTranslation = {
  /** "{value} context" */
  context: string;
  /** "{value} params" */
  parameters: string;
  /** "{value} active per token", added to the tooltip of a mixture-of-experts model. */
  activeNote: string;
  /** "Parameters": the row label of the admin model detail. */
  parametersLabel: string;
};

/** What a row shows beside the model's name, and the fuller text of its tooltip. */
export type ModelScaleText = {
  /** "1M context · 750B params". */
  label: string;
  /** The label, plus the active share of a mixture-of-experts model. */
  title: string;
};

/** A parameter count read from a runtime's own string ("7.6B", "671B (37B active)"). */
export type ParsedParameterCount = {
  totalBillions: number;
  activeBillions: number | null;
};

/** Where a list row gets its size from: the row's own numbers, a runtime string, the registry. */
export type ModelScaleSources = {
  contextTokens?: number | null;
  /** The runtime's own size string, which beats the registry's number for a local file. */
  runtimeParameterText?: string | null;
  parameterBillions?: number | null;
  activeParameterBillions?: number | null;
  entry?: ModelSizeEntry;
};
