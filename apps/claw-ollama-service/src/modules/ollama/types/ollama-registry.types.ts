export type OllamaRegistryLayer = {
  mediaType: string;
  digest: string;
  size: number;
};

export type OllamaRegistryManifest = {
  schemaVersion: number;
  mediaType: string;
  config: {
    mediaType: string;
    digest: string;
    size: number;
  };
  layers: OllamaRegistryLayer[] | null;
};

export type CatalogRemoteMetadata = {
  sourceUrl: string | null;
  isAvailable: boolean;
  isDownloadable: boolean;
  sizeBytes: bigint | null;
  resolvedOllamaName: string | null;
  availabilityError: string | null;
};

export type CatalogRemoteMetadataCacheEntry = {
  expiresAt: number;
  metadata: CatalogRemoteMetadata;
};

export type OllamaManifestLookupResult = {
  sourceUrl: string;
  resolvedOllamaName: string;
  manifest: OllamaRegistryManifest | null;
  availabilityError: string | null;
};
