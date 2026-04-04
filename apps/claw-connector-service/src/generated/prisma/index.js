
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/library.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}




  const path = require('path')

/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.ConnectorScalarFieldEnum = {
  id: 'id',
  name: 'name',
  provider: 'provider',
  status: 'status',
  authType: 'authType',
  encryptedConfig: 'encryptedConfig',
  isEnabled: 'isEnabled',
  defaultModelId: 'defaultModelId',
  baseUrl: 'baseUrl',
  region: 'region',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConnectorModelScalarFieldEnum = {
  id: 'id',
  connectorId: 'connectorId',
  provider: 'provider',
  modelKey: 'modelKey',
  displayName: 'displayName',
  lifecycle: 'lifecycle',
  supportsStreaming: 'supportsStreaming',
  supportsTools: 'supportsTools',
  supportsVision: 'supportsVision',
  supportsAudio: 'supportsAudio',
  supportsStructuredOutput: 'supportsStructuredOutput',
  maxContextTokens: 'maxContextTokens',
  syncedAt: 'syncedAt'
};

exports.Prisma.ConnectorHealthEventScalarFieldEnum = {
  id: 'id',
  connectorId: 'connectorId',
  status: 'status',
  latencyMs: 'latencyMs',
  errorMessage: 'errorMessage',
  checkedAt: 'checkedAt'
};

exports.Prisma.ModelSyncRunScalarFieldEnum = {
  id: 'id',
  connectorId: 'connectorId',
  status: 'status',
  modelsFound: 'modelsFound',
  modelsAdded: 'modelsAdded',
  modelsRemoved: 'modelsRemoved',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  errorMessage: 'errorMessage'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.ConnectorProvider = exports.$Enums.ConnectorProvider = {
  OPENAI: 'OPENAI',
  ANTHROPIC: 'ANTHROPIC',
  GEMINI: 'GEMINI',
  AWS_BEDROCK: 'AWS_BEDROCK',
  DEEPSEEK: 'DEEPSEEK',
  OLLAMA: 'OLLAMA'
};

exports.ConnectorStatus = exports.$Enums.ConnectorStatus = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  DOWN: 'DOWN',
  UNKNOWN: 'UNKNOWN'
};

exports.ConnectorAuthType = exports.$Enums.ConnectorAuthType = {
  API_KEY: 'API_KEY',
  OAUTH2: 'OAUTH2',
  NONE: 'NONE'
};

exports.ModelLifecycle = exports.$Enums.ModelLifecycle = {
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
  SUNSET: 'SUNSET'
};

exports.ModelSyncStatus = exports.$Enums.ModelSyncStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  Connector: 'Connector',
  ConnectorModel: 'ConnectorModel',
  ConnectorHealthEvent: 'ConnectorHealthEvent',
  ModelSyncRun: 'ModelSyncRun'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "D:\\Freelance\\Claw\\apps\\claw-connector-service\\src\\generated\\prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "D:\\Freelance\\Claw\\apps\\claw-connector-service\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider = \"prisma-client-js\"\n  output   = \"../src/generated/prisma\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// ─── Enums ───────────────────────────────────────────────\n\nenum ConnectorProvider {\n  OPENAI\n  ANTHROPIC\n  GEMINI\n  AWS_BEDROCK\n  DEEPSEEK\n  OLLAMA\n}\n\nenum ConnectorStatus {\n  HEALTHY\n  DEGRADED\n  DOWN\n  UNKNOWN\n}\n\nenum ConnectorAuthType {\n  API_KEY\n  OAUTH2\n  NONE\n}\n\nenum ModelLifecycle {\n  ACTIVE\n  DEPRECATED\n  SUNSET\n}\n\nenum ModelSyncStatus {\n  RUNNING\n  COMPLETED\n  FAILED\n}\n\n// ─── Models ──────────────────────────────────────────────\n\nmodel Connector {\n  id              String            @id @default(cuid())\n  name            String\n  provider        ConnectorProvider\n  status          ConnectorStatus   @default(UNKNOWN)\n  authType        ConnectorAuthType @map(\"auth_type\")\n  encryptedConfig String?           @map(\"encrypted_config\")\n  isEnabled       Boolean           @default(true) @map(\"is_enabled\")\n  defaultModelId  String?           @map(\"default_model_id\")\n  baseUrl         String?           @map(\"base_url\")\n  region          String?\n  createdAt       DateTime          @default(now()) @map(\"created_at\")\n  updatedAt       DateTime          @updatedAt @map(\"updated_at\")\n\n  models       ConnectorModel[]\n  healthEvents ConnectorHealthEvent[]\n  syncRuns     ModelSyncRun[]\n\n  @@index([provider])\n  @@index([status])\n  @@index([isEnabled])\n  @@map(\"connectors\")\n}\n\nmodel ConnectorModel {\n  id                       String            @id @default(cuid())\n  connectorId              String            @map(\"connector_id\")\n  provider                 ConnectorProvider\n  modelKey                 String            @map(\"model_key\")\n  displayName              String            @map(\"display_name\")\n  lifecycle                ModelLifecycle    @default(ACTIVE)\n  supportsStreaming        Boolean           @default(false) @map(\"supports_streaming\")\n  supportsTools            Boolean           @default(false) @map(\"supports_tools\")\n  supportsVision           Boolean           @default(false) @map(\"supports_vision\")\n  supportsAudio            Boolean           @default(false) @map(\"supports_audio\")\n  supportsStructuredOutput Boolean           @default(false) @map(\"supports_structured_output\")\n  maxContextTokens         Int?              @map(\"max_context_tokens\")\n  syncedAt                 DateTime          @default(now()) @map(\"synced_at\")\n\n  connector Connector @relation(fields: [connectorId], references: [id], onDelete: Cascade)\n\n  @@unique([connectorId, modelKey])\n  @@index([connectorId])\n  @@index([provider])\n  @@index([lifecycle])\n  @@map(\"connector_models\")\n}\n\nmodel ConnectorHealthEvent {\n  id           String          @id @default(cuid())\n  connectorId  String          @map(\"connector_id\")\n  status       ConnectorStatus\n  latencyMs    Int?            @map(\"latency_ms\")\n  errorMessage String?         @map(\"error_message\")\n  checkedAt    DateTime        @default(now()) @map(\"checked_at\")\n\n  connector Connector @relation(fields: [connectorId], references: [id], onDelete: Cascade)\n\n  @@index([connectorId])\n  @@index([checkedAt])\n  @@map(\"connector_health_events\")\n}\n\nmodel ModelSyncRun {\n  id            String          @id @default(cuid())\n  connectorId   String          @map(\"connector_id\")\n  status        ModelSyncStatus\n  modelsFound   Int             @default(0) @map(\"models_found\")\n  modelsAdded   Int             @default(0) @map(\"models_added\")\n  modelsRemoved Int             @default(0) @map(\"models_removed\")\n  startedAt     DateTime        @default(now()) @map(\"started_at\")\n  completedAt   DateTime?       @map(\"completed_at\")\n  errorMessage  String?         @map(\"error_message\")\n\n  connector Connector @relation(fields: [connectorId], references: [id], onDelete: Cascade)\n\n  @@index([connectorId])\n  @@index([status])\n  @@map(\"model_sync_runs\")\n}\n",
  "inlineSchemaHash": "b9dae61fc62cdf2339a6e48bd3ea4a9fd9fd7eb738c4f9d968a246fcdb9557dd",
  "copyEngine": true
}

const fs = require('fs')

config.dirname = __dirname
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = [
    "src/generated/prisma",
    "generated/prisma",
  ]
  
  const alternativePath = alternativePaths.find((altPath) => {
    return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))
  }) ?? alternativePaths[0]

  config.dirname = path.join(process.cwd(), alternativePath)
  config.isBundled = true
}

config.runtimeDataModel = JSON.parse("{\"models\":{\"Connector\":{\"dbName\":\"connectors\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"provider\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConnectorProvider\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"ConnectorStatus\",\"default\":\"UNKNOWN\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"authType\",\"dbName\":\"auth_type\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConnectorAuthType\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"encryptedConfig\",\"dbName\":\"encrypted_config\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isEnabled\",\"dbName\":\"is_enabled\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"defaultModelId\",\"dbName\":\"default_model_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"baseUrl\",\"dbName\":\"base_url\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"region\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"models\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConnectorModel\",\"relationName\":\"ConnectorToConnectorModel\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"healthEvents\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConnectorHealthEvent\",\"relationName\":\"ConnectorToConnectorHealthEvent\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"syncRuns\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ModelSyncRun\",\"relationName\":\"ConnectorToModelSyncRun\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ConnectorModel\":{\"dbName\":\"connector_models\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"connectorId\",\"dbName\":\"connector_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"provider\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConnectorProvider\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"modelKey\",\"dbName\":\"model_key\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"displayName\",\"dbName\":\"display_name\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"lifecycle\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"ModelLifecycle\",\"default\":\"ACTIVE\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"supportsStreaming\",\"dbName\":\"supports_streaming\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"supportsTools\",\"dbName\":\"supports_tools\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"supportsVision\",\"dbName\":\"supports_vision\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"supportsAudio\",\"dbName\":\"supports_audio\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"supportsStructuredOutput\",\"dbName\":\"supports_structured_output\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"maxContextTokens\",\"dbName\":\"max_context_tokens\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"syncedAt\",\"dbName\":\"synced_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"connector\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Connector\",\"relationName\":\"ConnectorToConnectorModel\",\"relationFromFields\":[\"connectorId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"connectorId\",\"modelKey\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"connectorId\",\"modelKey\"]}],\"isGenerated\":false},\"ConnectorHealthEvent\":{\"dbName\":\"connector_health_events\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"connectorId\",\"dbName\":\"connector_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ConnectorStatus\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"latencyMs\",\"dbName\":\"latency_ms\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"errorMessage\",\"dbName\":\"error_message\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"checkedAt\",\"dbName\":\"checked_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"connector\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Connector\",\"relationName\":\"ConnectorToConnectorHealthEvent\",\"relationFromFields\":[\"connectorId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"ModelSyncRun\":{\"dbName\":\"model_sync_runs\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"cuid\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"connectorId\",\"dbName\":\"connector_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"ModelSyncStatus\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"modelsFound\",\"dbName\":\"models_found\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"modelsAdded\",\"dbName\":\"models_added\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"modelsRemoved\",\"dbName\":\"models_removed\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"startedAt\",\"dbName\":\"started_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"completedAt\",\"dbName\":\"completed_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"errorMessage\",\"dbName\":\"error_message\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"connector\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Connector\",\"relationName\":\"ConnectorToModelSyncRun\",\"relationFromFields\":[\"connectorId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"ConnectorProvider\":{\"values\":[{\"name\":\"OPENAI\",\"dbName\":null},{\"name\":\"ANTHROPIC\",\"dbName\":null},{\"name\":\"GEMINI\",\"dbName\":null},{\"name\":\"AWS_BEDROCK\",\"dbName\":null},{\"name\":\"DEEPSEEK\",\"dbName\":null},{\"name\":\"OLLAMA\",\"dbName\":null}],\"dbName\":null},\"ConnectorStatus\":{\"values\":[{\"name\":\"HEALTHY\",\"dbName\":null},{\"name\":\"DEGRADED\",\"dbName\":null},{\"name\":\"DOWN\",\"dbName\":null},{\"name\":\"UNKNOWN\",\"dbName\":null}],\"dbName\":null},\"ConnectorAuthType\":{\"values\":[{\"name\":\"API_KEY\",\"dbName\":null},{\"name\":\"OAUTH2\",\"dbName\":null},{\"name\":\"NONE\",\"dbName\":null}],\"dbName\":null},\"ModelLifecycle\":{\"values\":[{\"name\":\"ACTIVE\",\"dbName\":null},{\"name\":\"DEPRECATED\",\"dbName\":null},{\"name\":\"SUNSET\",\"dbName\":null}],\"dbName\":null},\"ModelSyncStatus\":{\"values\":[{\"name\":\"RUNNING\",\"dbName\":null},{\"name\":\"COMPLETED\",\"dbName\":null},{\"name\":\"FAILED\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined


const { warnEnvConflicts } = require('./runtime/library.js')

warnEnvConflicts({
    rootEnvPath: config.relativeEnvPaths.rootEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
    schemaEnvPath: config.relativeEnvPaths.schemaEnvPath && path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath)
})

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

// file annotations for bundling tools to include these files
path.join(__dirname, "query_engine-windows.dll.node");
path.join(process.cwd(), "src/generated/prisma/query_engine-windows.dll.node")
// file annotations for bundling tools to include these files
path.join(__dirname, "schema.prisma");
path.join(process.cwd(), "src/generated/prisma/schema.prisma")
