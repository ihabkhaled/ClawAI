
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Connector
 * 
 */
export type Connector = $Result.DefaultSelection<Prisma.$ConnectorPayload>
/**
 * Model ConnectorModel
 * 
 */
export type ConnectorModel = $Result.DefaultSelection<Prisma.$ConnectorModelPayload>
/**
 * Model ConnectorHealthEvent
 * 
 */
export type ConnectorHealthEvent = $Result.DefaultSelection<Prisma.$ConnectorHealthEventPayload>
/**
 * Model ModelSyncRun
 * 
 */
export type ModelSyncRun = $Result.DefaultSelection<Prisma.$ModelSyncRunPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ConnectorProvider: {
  OPENAI: 'OPENAI',
  ANTHROPIC: 'ANTHROPIC',
  GEMINI: 'GEMINI',
  AWS_BEDROCK: 'AWS_BEDROCK',
  DEEPSEEK: 'DEEPSEEK',
  OLLAMA: 'OLLAMA'
};

export type ConnectorProvider = (typeof ConnectorProvider)[keyof typeof ConnectorProvider]


export const ConnectorStatus: {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  DOWN: 'DOWN',
  UNKNOWN: 'UNKNOWN'
};

export type ConnectorStatus = (typeof ConnectorStatus)[keyof typeof ConnectorStatus]


export const ConnectorAuthType: {
  API_KEY: 'API_KEY',
  OAUTH2: 'OAUTH2',
  NONE: 'NONE'
};

export type ConnectorAuthType = (typeof ConnectorAuthType)[keyof typeof ConnectorAuthType]


export const ModelLifecycle: {
  ACTIVE: 'ACTIVE',
  DEPRECATED: 'DEPRECATED',
  SUNSET: 'SUNSET'
};

export type ModelLifecycle = (typeof ModelLifecycle)[keyof typeof ModelLifecycle]


export const ModelSyncStatus: {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

export type ModelSyncStatus = (typeof ModelSyncStatus)[keyof typeof ModelSyncStatus]

}

export type ConnectorProvider = $Enums.ConnectorProvider

export const ConnectorProvider: typeof $Enums.ConnectorProvider

export type ConnectorStatus = $Enums.ConnectorStatus

export const ConnectorStatus: typeof $Enums.ConnectorStatus

export type ConnectorAuthType = $Enums.ConnectorAuthType

export const ConnectorAuthType: typeof $Enums.ConnectorAuthType

export type ModelLifecycle = $Enums.ModelLifecycle

export const ModelLifecycle: typeof $Enums.ModelLifecycle

export type ModelSyncStatus = $Enums.ModelSyncStatus

export const ModelSyncStatus: typeof $Enums.ModelSyncStatus

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Connectors
 * const connectors = await prisma.connector.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Connectors
   * const connectors = await prisma.connector.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.connector`: Exposes CRUD operations for the **Connector** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Connectors
    * const connectors = await prisma.connector.findMany()
    * ```
    */
  get connector(): Prisma.ConnectorDelegate<ExtArgs>;

  /**
   * `prisma.connectorModel`: Exposes CRUD operations for the **ConnectorModel** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ConnectorModels
    * const connectorModels = await prisma.connectorModel.findMany()
    * ```
    */
  get connectorModel(): Prisma.ConnectorModelDelegate<ExtArgs>;

  /**
   * `prisma.connectorHealthEvent`: Exposes CRUD operations for the **ConnectorHealthEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ConnectorHealthEvents
    * const connectorHealthEvents = await prisma.connectorHealthEvent.findMany()
    * ```
    */
  get connectorHealthEvent(): Prisma.ConnectorHealthEventDelegate<ExtArgs>;

  /**
   * `prisma.modelSyncRun`: Exposes CRUD operations for the **ModelSyncRun** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ModelSyncRuns
    * const modelSyncRuns = await prisma.modelSyncRun.findMany()
    * ```
    */
  get modelSyncRun(): Prisma.ModelSyncRunDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Connector: 'Connector',
    ConnectorModel: 'ConnectorModel',
    ConnectorHealthEvent: 'ConnectorHealthEvent',
    ModelSyncRun: 'ModelSyncRun'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "connector" | "connectorModel" | "connectorHealthEvent" | "modelSyncRun"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Connector: {
        payload: Prisma.$ConnectorPayload<ExtArgs>
        fields: Prisma.ConnectorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConnectorFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConnectorFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          findFirst: {
            args: Prisma.ConnectorFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConnectorFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          findMany: {
            args: Prisma.ConnectorFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>[]
          }
          create: {
            args: Prisma.ConnectorCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          createMany: {
            args: Prisma.ConnectorCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConnectorCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>[]
          }
          delete: {
            args: Prisma.ConnectorDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          update: {
            args: Prisma.ConnectorUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          deleteMany: {
            args: Prisma.ConnectorDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConnectorUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ConnectorUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorPayload>
          }
          aggregate: {
            args: Prisma.ConnectorAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConnector>
          }
          groupBy: {
            args: Prisma.ConnectorGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConnectorGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConnectorCountArgs<ExtArgs>
            result: $Utils.Optional<ConnectorCountAggregateOutputType> | number
          }
        }
      }
      ConnectorModel: {
        payload: Prisma.$ConnectorModelPayload<ExtArgs>
        fields: Prisma.ConnectorModelFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConnectorModelFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConnectorModelFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>
          }
          findFirst: {
            args: Prisma.ConnectorModelFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConnectorModelFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>
          }
          findMany: {
            args: Prisma.ConnectorModelFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>[]
          }
          create: {
            args: Prisma.ConnectorModelCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>
          }
          createMany: {
            args: Prisma.ConnectorModelCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConnectorModelCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>[]
          }
          delete: {
            args: Prisma.ConnectorModelDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>
          }
          update: {
            args: Prisma.ConnectorModelUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>
          }
          deleteMany: {
            args: Prisma.ConnectorModelDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConnectorModelUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ConnectorModelUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorModelPayload>
          }
          aggregate: {
            args: Prisma.ConnectorModelAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConnectorModel>
          }
          groupBy: {
            args: Prisma.ConnectorModelGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConnectorModelGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConnectorModelCountArgs<ExtArgs>
            result: $Utils.Optional<ConnectorModelCountAggregateOutputType> | number
          }
        }
      }
      ConnectorHealthEvent: {
        payload: Prisma.$ConnectorHealthEventPayload<ExtArgs>
        fields: Prisma.ConnectorHealthEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ConnectorHealthEventFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ConnectorHealthEventFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>
          }
          findFirst: {
            args: Prisma.ConnectorHealthEventFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ConnectorHealthEventFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>
          }
          findMany: {
            args: Prisma.ConnectorHealthEventFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>[]
          }
          create: {
            args: Prisma.ConnectorHealthEventCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>
          }
          createMany: {
            args: Prisma.ConnectorHealthEventCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ConnectorHealthEventCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>[]
          }
          delete: {
            args: Prisma.ConnectorHealthEventDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>
          }
          update: {
            args: Prisma.ConnectorHealthEventUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>
          }
          deleteMany: {
            args: Prisma.ConnectorHealthEventDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ConnectorHealthEventUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ConnectorHealthEventUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ConnectorHealthEventPayload>
          }
          aggregate: {
            args: Prisma.ConnectorHealthEventAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateConnectorHealthEvent>
          }
          groupBy: {
            args: Prisma.ConnectorHealthEventGroupByArgs<ExtArgs>
            result: $Utils.Optional<ConnectorHealthEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.ConnectorHealthEventCountArgs<ExtArgs>
            result: $Utils.Optional<ConnectorHealthEventCountAggregateOutputType> | number
          }
        }
      }
      ModelSyncRun: {
        payload: Prisma.$ModelSyncRunPayload<ExtArgs>
        fields: Prisma.ModelSyncRunFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ModelSyncRunFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ModelSyncRunFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>
          }
          findFirst: {
            args: Prisma.ModelSyncRunFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ModelSyncRunFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>
          }
          findMany: {
            args: Prisma.ModelSyncRunFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>[]
          }
          create: {
            args: Prisma.ModelSyncRunCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>
          }
          createMany: {
            args: Prisma.ModelSyncRunCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ModelSyncRunCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>[]
          }
          delete: {
            args: Prisma.ModelSyncRunDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>
          }
          update: {
            args: Prisma.ModelSyncRunUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>
          }
          deleteMany: {
            args: Prisma.ModelSyncRunDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ModelSyncRunUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ModelSyncRunUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ModelSyncRunPayload>
          }
          aggregate: {
            args: Prisma.ModelSyncRunAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateModelSyncRun>
          }
          groupBy: {
            args: Prisma.ModelSyncRunGroupByArgs<ExtArgs>
            result: $Utils.Optional<ModelSyncRunGroupByOutputType>[]
          }
          count: {
            args: Prisma.ModelSyncRunCountArgs<ExtArgs>
            result: $Utils.Optional<ModelSyncRunCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ConnectorCountOutputType
   */

  export type ConnectorCountOutputType = {
    models: number
    healthEvents: number
    syncRuns: number
  }

  export type ConnectorCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    models?: boolean | ConnectorCountOutputTypeCountModelsArgs
    healthEvents?: boolean | ConnectorCountOutputTypeCountHealthEventsArgs
    syncRuns?: boolean | ConnectorCountOutputTypeCountSyncRunsArgs
  }

  // Custom InputTypes
  /**
   * ConnectorCountOutputType without action
   */
  export type ConnectorCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorCountOutputType
     */
    select?: ConnectorCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ConnectorCountOutputType without action
   */
  export type ConnectorCountOutputTypeCountModelsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorModelWhereInput
  }

  /**
   * ConnectorCountOutputType without action
   */
  export type ConnectorCountOutputTypeCountHealthEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorHealthEventWhereInput
  }

  /**
   * ConnectorCountOutputType without action
   */
  export type ConnectorCountOutputTypeCountSyncRunsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ModelSyncRunWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Connector
   */

  export type AggregateConnector = {
    _count: ConnectorCountAggregateOutputType | null
    _min: ConnectorMinAggregateOutputType | null
    _max: ConnectorMaxAggregateOutputType | null
  }

  export type ConnectorMinAggregateOutputType = {
    id: string | null
    name: string | null
    provider: $Enums.ConnectorProvider | null
    status: $Enums.ConnectorStatus | null
    authType: $Enums.ConnectorAuthType | null
    encryptedConfig: string | null
    isEnabled: boolean | null
    defaultModelId: string | null
    baseUrl: string | null
    region: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ConnectorMaxAggregateOutputType = {
    id: string | null
    name: string | null
    provider: $Enums.ConnectorProvider | null
    status: $Enums.ConnectorStatus | null
    authType: $Enums.ConnectorAuthType | null
    encryptedConfig: string | null
    isEnabled: boolean | null
    defaultModelId: string | null
    baseUrl: string | null
    region: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ConnectorCountAggregateOutputType = {
    id: number
    name: number
    provider: number
    status: number
    authType: number
    encryptedConfig: number
    isEnabled: number
    defaultModelId: number
    baseUrl: number
    region: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ConnectorMinAggregateInputType = {
    id?: true
    name?: true
    provider?: true
    status?: true
    authType?: true
    encryptedConfig?: true
    isEnabled?: true
    defaultModelId?: true
    baseUrl?: true
    region?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ConnectorMaxAggregateInputType = {
    id?: true
    name?: true
    provider?: true
    status?: true
    authType?: true
    encryptedConfig?: true
    isEnabled?: true
    defaultModelId?: true
    baseUrl?: true
    region?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ConnectorCountAggregateInputType = {
    id?: true
    name?: true
    provider?: true
    status?: true
    authType?: true
    encryptedConfig?: true
    isEnabled?: true
    defaultModelId?: true
    baseUrl?: true
    region?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ConnectorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Connector to aggregate.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Connectors
    **/
    _count?: true | ConnectorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConnectorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConnectorMaxAggregateInputType
  }

  export type GetConnectorAggregateType<T extends ConnectorAggregateArgs> = {
        [P in keyof T & keyof AggregateConnector]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConnector[P]>
      : GetScalarType<T[P], AggregateConnector[P]>
  }




  export type ConnectorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorWhereInput
    orderBy?: ConnectorOrderByWithAggregationInput | ConnectorOrderByWithAggregationInput[]
    by: ConnectorScalarFieldEnum[] | ConnectorScalarFieldEnum
    having?: ConnectorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConnectorCountAggregateInputType | true
    _min?: ConnectorMinAggregateInputType
    _max?: ConnectorMaxAggregateInputType
  }

  export type ConnectorGroupByOutputType = {
    id: string
    name: string
    provider: $Enums.ConnectorProvider
    status: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig: string | null
    isEnabled: boolean
    defaultModelId: string | null
    baseUrl: string | null
    region: string | null
    createdAt: Date
    updatedAt: Date
    _count: ConnectorCountAggregateOutputType | null
    _min: ConnectorMinAggregateOutputType | null
    _max: ConnectorMaxAggregateOutputType | null
  }

  type GetConnectorGroupByPayload<T extends ConnectorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConnectorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConnectorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConnectorGroupByOutputType[P]>
            : GetScalarType<T[P], ConnectorGroupByOutputType[P]>
        }
      >
    >


  export type ConnectorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    provider?: boolean
    status?: boolean
    authType?: boolean
    encryptedConfig?: boolean
    isEnabled?: boolean
    defaultModelId?: boolean
    baseUrl?: boolean
    region?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    models?: boolean | Connector$modelsArgs<ExtArgs>
    healthEvents?: boolean | Connector$healthEventsArgs<ExtArgs>
    syncRuns?: boolean | Connector$syncRunsArgs<ExtArgs>
    _count?: boolean | ConnectorCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connector"]>

  export type ConnectorSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    provider?: boolean
    status?: boolean
    authType?: boolean
    encryptedConfig?: boolean
    isEnabled?: boolean
    defaultModelId?: boolean
    baseUrl?: boolean
    region?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["connector"]>

  export type ConnectorSelectScalar = {
    id?: boolean
    name?: boolean
    provider?: boolean
    status?: boolean
    authType?: boolean
    encryptedConfig?: boolean
    isEnabled?: boolean
    defaultModelId?: boolean
    baseUrl?: boolean
    region?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ConnectorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    models?: boolean | Connector$modelsArgs<ExtArgs>
    healthEvents?: boolean | Connector$healthEventsArgs<ExtArgs>
    syncRuns?: boolean | Connector$syncRunsArgs<ExtArgs>
    _count?: boolean | ConnectorCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ConnectorIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ConnectorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Connector"
    objects: {
      models: Prisma.$ConnectorModelPayload<ExtArgs>[]
      healthEvents: Prisma.$ConnectorHealthEventPayload<ExtArgs>[]
      syncRuns: Prisma.$ModelSyncRunPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      provider: $Enums.ConnectorProvider
      status: $Enums.ConnectorStatus
      authType: $Enums.ConnectorAuthType
      encryptedConfig: string | null
      isEnabled: boolean
      defaultModelId: string | null
      baseUrl: string | null
      region: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["connector"]>
    composites: {}
  }

  type ConnectorGetPayload<S extends boolean | null | undefined | ConnectorDefaultArgs> = $Result.GetResult<Prisma.$ConnectorPayload, S>

  type ConnectorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ConnectorFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ConnectorCountAggregateInputType | true
    }

  export interface ConnectorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Connector'], meta: { name: 'Connector' } }
    /**
     * Find zero or one Connector that matches the filter.
     * @param {ConnectorFindUniqueArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConnectorFindUniqueArgs>(args: SelectSubset<T, ConnectorFindUniqueArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one Connector that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ConnectorFindUniqueOrThrowArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConnectorFindUniqueOrThrowArgs>(args: SelectSubset<T, ConnectorFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first Connector that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorFindFirstArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConnectorFindFirstArgs>(args?: SelectSubset<T, ConnectorFindFirstArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first Connector that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorFindFirstOrThrowArgs} args - Arguments to find a Connector
     * @example
     * // Get one Connector
     * const connector = await prisma.connector.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConnectorFindFirstOrThrowArgs>(args?: SelectSubset<T, ConnectorFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Connectors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Connectors
     * const connectors = await prisma.connector.findMany()
     * 
     * // Get first 10 Connectors
     * const connectors = await prisma.connector.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const connectorWithIdOnly = await prisma.connector.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConnectorFindManyArgs>(args?: SelectSubset<T, ConnectorFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a Connector.
     * @param {ConnectorCreateArgs} args - Arguments to create a Connector.
     * @example
     * // Create one Connector
     * const Connector = await prisma.connector.create({
     *   data: {
     *     // ... data to create a Connector
     *   }
     * })
     * 
     */
    create<T extends ConnectorCreateArgs>(args: SelectSubset<T, ConnectorCreateArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Connectors.
     * @param {ConnectorCreateManyArgs} args - Arguments to create many Connectors.
     * @example
     * // Create many Connectors
     * const connector = await prisma.connector.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConnectorCreateManyArgs>(args?: SelectSubset<T, ConnectorCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Connectors and returns the data saved in the database.
     * @param {ConnectorCreateManyAndReturnArgs} args - Arguments to create many Connectors.
     * @example
     * // Create many Connectors
     * const connector = await prisma.connector.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Connectors and only return the `id`
     * const connectorWithIdOnly = await prisma.connector.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConnectorCreateManyAndReturnArgs>(args?: SelectSubset<T, ConnectorCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a Connector.
     * @param {ConnectorDeleteArgs} args - Arguments to delete one Connector.
     * @example
     * // Delete one Connector
     * const Connector = await prisma.connector.delete({
     *   where: {
     *     // ... filter to delete one Connector
     *   }
     * })
     * 
     */
    delete<T extends ConnectorDeleteArgs>(args: SelectSubset<T, ConnectorDeleteArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one Connector.
     * @param {ConnectorUpdateArgs} args - Arguments to update one Connector.
     * @example
     * // Update one Connector
     * const connector = await prisma.connector.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConnectorUpdateArgs>(args: SelectSubset<T, ConnectorUpdateArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Connectors.
     * @param {ConnectorDeleteManyArgs} args - Arguments to filter Connectors to delete.
     * @example
     * // Delete a few Connectors
     * const { count } = await prisma.connector.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConnectorDeleteManyArgs>(args?: SelectSubset<T, ConnectorDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Connectors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Connectors
     * const connector = await prisma.connector.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConnectorUpdateManyArgs>(args: SelectSubset<T, ConnectorUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Connector.
     * @param {ConnectorUpsertArgs} args - Arguments to update or create a Connector.
     * @example
     * // Update or create a Connector
     * const connector = await prisma.connector.upsert({
     *   create: {
     *     // ... data to create a Connector
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Connector we want to update
     *   }
     * })
     */
    upsert<T extends ConnectorUpsertArgs>(args: SelectSubset<T, ConnectorUpsertArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Connectors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorCountArgs} args - Arguments to filter Connectors to count.
     * @example
     * // Count the number of Connectors
     * const count = await prisma.connector.count({
     *   where: {
     *     // ... the filter for the Connectors we want to count
     *   }
     * })
    **/
    count<T extends ConnectorCountArgs>(
      args?: Subset<T, ConnectorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConnectorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Connector.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConnectorAggregateArgs>(args: Subset<T, ConnectorAggregateArgs>): Prisma.PrismaPromise<GetConnectorAggregateType<T>>

    /**
     * Group by Connector.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConnectorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConnectorGroupByArgs['orderBy'] }
        : { orderBy?: ConnectorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConnectorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConnectorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Connector model
   */
  readonly fields: ConnectorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Connector.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConnectorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    models<T extends Connector$modelsArgs<ExtArgs> = {}>(args?: Subset<T, Connector$modelsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "findMany"> | Null>
    healthEvents<T extends Connector$healthEventsArgs<ExtArgs> = {}>(args?: Subset<T, Connector$healthEventsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "findMany"> | Null>
    syncRuns<T extends Connector$syncRunsArgs<ExtArgs> = {}>(args?: Subset<T, Connector$syncRunsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "findMany"> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Connector model
   */ 
  interface ConnectorFieldRefs {
    readonly id: FieldRef<"Connector", 'String'>
    readonly name: FieldRef<"Connector", 'String'>
    readonly provider: FieldRef<"Connector", 'ConnectorProvider'>
    readonly status: FieldRef<"Connector", 'ConnectorStatus'>
    readonly authType: FieldRef<"Connector", 'ConnectorAuthType'>
    readonly encryptedConfig: FieldRef<"Connector", 'String'>
    readonly isEnabled: FieldRef<"Connector", 'Boolean'>
    readonly defaultModelId: FieldRef<"Connector", 'String'>
    readonly baseUrl: FieldRef<"Connector", 'String'>
    readonly region: FieldRef<"Connector", 'String'>
    readonly createdAt: FieldRef<"Connector", 'DateTime'>
    readonly updatedAt: FieldRef<"Connector", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Connector findUnique
   */
  export type ConnectorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector findUniqueOrThrow
   */
  export type ConnectorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector findFirst
   */
  export type ConnectorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Connectors.
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Connectors.
     */
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Connector findFirstOrThrow
   */
  export type ConnectorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connector to fetch.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Connectors.
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Connectors.
     */
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Connector findMany
   */
  export type ConnectorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter, which Connectors to fetch.
     */
    where?: ConnectorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Connectors to fetch.
     */
    orderBy?: ConnectorOrderByWithRelationInput | ConnectorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Connectors.
     */
    cursor?: ConnectorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Connectors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Connectors.
     */
    skip?: number
    distinct?: ConnectorScalarFieldEnum | ConnectorScalarFieldEnum[]
  }

  /**
   * Connector create
   */
  export type ConnectorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * The data needed to create a Connector.
     */
    data: XOR<ConnectorCreateInput, ConnectorUncheckedCreateInput>
  }

  /**
   * Connector createMany
   */
  export type ConnectorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Connectors.
     */
    data: ConnectorCreateManyInput | ConnectorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Connector createManyAndReturn
   */
  export type ConnectorCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Connectors.
     */
    data: ConnectorCreateManyInput | ConnectorCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Connector update
   */
  export type ConnectorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * The data needed to update a Connector.
     */
    data: XOR<ConnectorUpdateInput, ConnectorUncheckedUpdateInput>
    /**
     * Choose, which Connector to update.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector updateMany
   */
  export type ConnectorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Connectors.
     */
    data: XOR<ConnectorUpdateManyMutationInput, ConnectorUncheckedUpdateManyInput>
    /**
     * Filter which Connectors to update
     */
    where?: ConnectorWhereInput
  }

  /**
   * Connector upsert
   */
  export type ConnectorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * The filter to search for the Connector to update in case it exists.
     */
    where: ConnectorWhereUniqueInput
    /**
     * In case the Connector found by the `where` argument doesn't exist, create a new Connector with this data.
     */
    create: XOR<ConnectorCreateInput, ConnectorUncheckedCreateInput>
    /**
     * In case the Connector was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConnectorUpdateInput, ConnectorUncheckedUpdateInput>
  }

  /**
   * Connector delete
   */
  export type ConnectorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
    /**
     * Filter which Connector to delete.
     */
    where: ConnectorWhereUniqueInput
  }

  /**
   * Connector deleteMany
   */
  export type ConnectorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Connectors to delete
     */
    where?: ConnectorWhereInput
  }

  /**
   * Connector.models
   */
  export type Connector$modelsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    where?: ConnectorModelWhereInput
    orderBy?: ConnectorModelOrderByWithRelationInput | ConnectorModelOrderByWithRelationInput[]
    cursor?: ConnectorModelWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConnectorModelScalarFieldEnum | ConnectorModelScalarFieldEnum[]
  }

  /**
   * Connector.healthEvents
   */
  export type Connector$healthEventsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    where?: ConnectorHealthEventWhereInput
    orderBy?: ConnectorHealthEventOrderByWithRelationInput | ConnectorHealthEventOrderByWithRelationInput[]
    cursor?: ConnectorHealthEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ConnectorHealthEventScalarFieldEnum | ConnectorHealthEventScalarFieldEnum[]
  }

  /**
   * Connector.syncRuns
   */
  export type Connector$syncRunsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    where?: ModelSyncRunWhereInput
    orderBy?: ModelSyncRunOrderByWithRelationInput | ModelSyncRunOrderByWithRelationInput[]
    cursor?: ModelSyncRunWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ModelSyncRunScalarFieldEnum | ModelSyncRunScalarFieldEnum[]
  }

  /**
   * Connector without action
   */
  export type ConnectorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Connector
     */
    select?: ConnectorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorInclude<ExtArgs> | null
  }


  /**
   * Model ConnectorModel
   */

  export type AggregateConnectorModel = {
    _count: ConnectorModelCountAggregateOutputType | null
    _avg: ConnectorModelAvgAggregateOutputType | null
    _sum: ConnectorModelSumAggregateOutputType | null
    _min: ConnectorModelMinAggregateOutputType | null
    _max: ConnectorModelMaxAggregateOutputType | null
  }

  export type ConnectorModelAvgAggregateOutputType = {
    maxContextTokens: number | null
  }

  export type ConnectorModelSumAggregateOutputType = {
    maxContextTokens: number | null
  }

  export type ConnectorModelMinAggregateOutputType = {
    id: string | null
    connectorId: string | null
    provider: $Enums.ConnectorProvider | null
    modelKey: string | null
    displayName: string | null
    lifecycle: $Enums.ModelLifecycle | null
    supportsStreaming: boolean | null
    supportsTools: boolean | null
    supportsVision: boolean | null
    supportsAudio: boolean | null
    supportsStructuredOutput: boolean | null
    maxContextTokens: number | null
    syncedAt: Date | null
  }

  export type ConnectorModelMaxAggregateOutputType = {
    id: string | null
    connectorId: string | null
    provider: $Enums.ConnectorProvider | null
    modelKey: string | null
    displayName: string | null
    lifecycle: $Enums.ModelLifecycle | null
    supportsStreaming: boolean | null
    supportsTools: boolean | null
    supportsVision: boolean | null
    supportsAudio: boolean | null
    supportsStructuredOutput: boolean | null
    maxContextTokens: number | null
    syncedAt: Date | null
  }

  export type ConnectorModelCountAggregateOutputType = {
    id: number
    connectorId: number
    provider: number
    modelKey: number
    displayName: number
    lifecycle: number
    supportsStreaming: number
    supportsTools: number
    supportsVision: number
    supportsAudio: number
    supportsStructuredOutput: number
    maxContextTokens: number
    syncedAt: number
    _all: number
  }


  export type ConnectorModelAvgAggregateInputType = {
    maxContextTokens?: true
  }

  export type ConnectorModelSumAggregateInputType = {
    maxContextTokens?: true
  }

  export type ConnectorModelMinAggregateInputType = {
    id?: true
    connectorId?: true
    provider?: true
    modelKey?: true
    displayName?: true
    lifecycle?: true
    supportsStreaming?: true
    supportsTools?: true
    supportsVision?: true
    supportsAudio?: true
    supportsStructuredOutput?: true
    maxContextTokens?: true
    syncedAt?: true
  }

  export type ConnectorModelMaxAggregateInputType = {
    id?: true
    connectorId?: true
    provider?: true
    modelKey?: true
    displayName?: true
    lifecycle?: true
    supportsStreaming?: true
    supportsTools?: true
    supportsVision?: true
    supportsAudio?: true
    supportsStructuredOutput?: true
    maxContextTokens?: true
    syncedAt?: true
  }

  export type ConnectorModelCountAggregateInputType = {
    id?: true
    connectorId?: true
    provider?: true
    modelKey?: true
    displayName?: true
    lifecycle?: true
    supportsStreaming?: true
    supportsTools?: true
    supportsVision?: true
    supportsAudio?: true
    supportsStructuredOutput?: true
    maxContextTokens?: true
    syncedAt?: true
    _all?: true
  }

  export type ConnectorModelAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConnectorModel to aggregate.
     */
    where?: ConnectorModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorModels to fetch.
     */
    orderBy?: ConnectorModelOrderByWithRelationInput | ConnectorModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConnectorModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorModels.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ConnectorModels
    **/
    _count?: true | ConnectorModelCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ConnectorModelAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ConnectorModelSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConnectorModelMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConnectorModelMaxAggregateInputType
  }

  export type GetConnectorModelAggregateType<T extends ConnectorModelAggregateArgs> = {
        [P in keyof T & keyof AggregateConnectorModel]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConnectorModel[P]>
      : GetScalarType<T[P], AggregateConnectorModel[P]>
  }




  export type ConnectorModelGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorModelWhereInput
    orderBy?: ConnectorModelOrderByWithAggregationInput | ConnectorModelOrderByWithAggregationInput[]
    by: ConnectorModelScalarFieldEnum[] | ConnectorModelScalarFieldEnum
    having?: ConnectorModelScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConnectorModelCountAggregateInputType | true
    _avg?: ConnectorModelAvgAggregateInputType
    _sum?: ConnectorModelSumAggregateInputType
    _min?: ConnectorModelMinAggregateInputType
    _max?: ConnectorModelMaxAggregateInputType
  }

  export type ConnectorModelGroupByOutputType = {
    id: string
    connectorId: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle: $Enums.ModelLifecycle
    supportsStreaming: boolean
    supportsTools: boolean
    supportsVision: boolean
    supportsAudio: boolean
    supportsStructuredOutput: boolean
    maxContextTokens: number | null
    syncedAt: Date
    _count: ConnectorModelCountAggregateOutputType | null
    _avg: ConnectorModelAvgAggregateOutputType | null
    _sum: ConnectorModelSumAggregateOutputType | null
    _min: ConnectorModelMinAggregateOutputType | null
    _max: ConnectorModelMaxAggregateOutputType | null
  }

  type GetConnectorModelGroupByPayload<T extends ConnectorModelGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConnectorModelGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConnectorModelGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConnectorModelGroupByOutputType[P]>
            : GetScalarType<T[P], ConnectorModelGroupByOutputType[P]>
        }
      >
    >


  export type ConnectorModelSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    connectorId?: boolean
    provider?: boolean
    modelKey?: boolean
    displayName?: boolean
    lifecycle?: boolean
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: boolean
    syncedAt?: boolean
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connectorModel"]>

  export type ConnectorModelSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    connectorId?: boolean
    provider?: boolean
    modelKey?: boolean
    displayName?: boolean
    lifecycle?: boolean
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: boolean
    syncedAt?: boolean
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connectorModel"]>

  export type ConnectorModelSelectScalar = {
    id?: boolean
    connectorId?: boolean
    provider?: boolean
    modelKey?: boolean
    displayName?: boolean
    lifecycle?: boolean
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: boolean
    syncedAt?: boolean
  }

  export type ConnectorModelInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }
  export type ConnectorModelIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }

  export type $ConnectorModelPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ConnectorModel"
    objects: {
      connector: Prisma.$ConnectorPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      connectorId: string
      provider: $Enums.ConnectorProvider
      modelKey: string
      displayName: string
      lifecycle: $Enums.ModelLifecycle
      supportsStreaming: boolean
      supportsTools: boolean
      supportsVision: boolean
      supportsAudio: boolean
      supportsStructuredOutput: boolean
      maxContextTokens: number | null
      syncedAt: Date
    }, ExtArgs["result"]["connectorModel"]>
    composites: {}
  }

  type ConnectorModelGetPayload<S extends boolean | null | undefined | ConnectorModelDefaultArgs> = $Result.GetResult<Prisma.$ConnectorModelPayload, S>

  type ConnectorModelCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ConnectorModelFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ConnectorModelCountAggregateInputType | true
    }

  export interface ConnectorModelDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ConnectorModel'], meta: { name: 'ConnectorModel' } }
    /**
     * Find zero or one ConnectorModel that matches the filter.
     * @param {ConnectorModelFindUniqueArgs} args - Arguments to find a ConnectorModel
     * @example
     * // Get one ConnectorModel
     * const connectorModel = await prisma.connectorModel.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConnectorModelFindUniqueArgs>(args: SelectSubset<T, ConnectorModelFindUniqueArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ConnectorModel that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ConnectorModelFindUniqueOrThrowArgs} args - Arguments to find a ConnectorModel
     * @example
     * // Get one ConnectorModel
     * const connectorModel = await prisma.connectorModel.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConnectorModelFindUniqueOrThrowArgs>(args: SelectSubset<T, ConnectorModelFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ConnectorModel that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelFindFirstArgs} args - Arguments to find a ConnectorModel
     * @example
     * // Get one ConnectorModel
     * const connectorModel = await prisma.connectorModel.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConnectorModelFindFirstArgs>(args?: SelectSubset<T, ConnectorModelFindFirstArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ConnectorModel that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelFindFirstOrThrowArgs} args - Arguments to find a ConnectorModel
     * @example
     * // Get one ConnectorModel
     * const connectorModel = await prisma.connectorModel.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConnectorModelFindFirstOrThrowArgs>(args?: SelectSubset<T, ConnectorModelFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ConnectorModels that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ConnectorModels
     * const connectorModels = await prisma.connectorModel.findMany()
     * 
     * // Get first 10 ConnectorModels
     * const connectorModels = await prisma.connectorModel.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const connectorModelWithIdOnly = await prisma.connectorModel.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConnectorModelFindManyArgs>(args?: SelectSubset<T, ConnectorModelFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ConnectorModel.
     * @param {ConnectorModelCreateArgs} args - Arguments to create a ConnectorModel.
     * @example
     * // Create one ConnectorModel
     * const ConnectorModel = await prisma.connectorModel.create({
     *   data: {
     *     // ... data to create a ConnectorModel
     *   }
     * })
     * 
     */
    create<T extends ConnectorModelCreateArgs>(args: SelectSubset<T, ConnectorModelCreateArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ConnectorModels.
     * @param {ConnectorModelCreateManyArgs} args - Arguments to create many ConnectorModels.
     * @example
     * // Create many ConnectorModels
     * const connectorModel = await prisma.connectorModel.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConnectorModelCreateManyArgs>(args?: SelectSubset<T, ConnectorModelCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ConnectorModels and returns the data saved in the database.
     * @param {ConnectorModelCreateManyAndReturnArgs} args - Arguments to create many ConnectorModels.
     * @example
     * // Create many ConnectorModels
     * const connectorModel = await prisma.connectorModel.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ConnectorModels and only return the `id`
     * const connectorModelWithIdOnly = await prisma.connectorModel.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConnectorModelCreateManyAndReturnArgs>(args?: SelectSubset<T, ConnectorModelCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ConnectorModel.
     * @param {ConnectorModelDeleteArgs} args - Arguments to delete one ConnectorModel.
     * @example
     * // Delete one ConnectorModel
     * const ConnectorModel = await prisma.connectorModel.delete({
     *   where: {
     *     // ... filter to delete one ConnectorModel
     *   }
     * })
     * 
     */
    delete<T extends ConnectorModelDeleteArgs>(args: SelectSubset<T, ConnectorModelDeleteArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ConnectorModel.
     * @param {ConnectorModelUpdateArgs} args - Arguments to update one ConnectorModel.
     * @example
     * // Update one ConnectorModel
     * const connectorModel = await prisma.connectorModel.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConnectorModelUpdateArgs>(args: SelectSubset<T, ConnectorModelUpdateArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ConnectorModels.
     * @param {ConnectorModelDeleteManyArgs} args - Arguments to filter ConnectorModels to delete.
     * @example
     * // Delete a few ConnectorModels
     * const { count } = await prisma.connectorModel.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConnectorModelDeleteManyArgs>(args?: SelectSubset<T, ConnectorModelDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConnectorModels.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ConnectorModels
     * const connectorModel = await prisma.connectorModel.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConnectorModelUpdateManyArgs>(args: SelectSubset<T, ConnectorModelUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ConnectorModel.
     * @param {ConnectorModelUpsertArgs} args - Arguments to update or create a ConnectorModel.
     * @example
     * // Update or create a ConnectorModel
     * const connectorModel = await prisma.connectorModel.upsert({
     *   create: {
     *     // ... data to create a ConnectorModel
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ConnectorModel we want to update
     *   }
     * })
     */
    upsert<T extends ConnectorModelUpsertArgs>(args: SelectSubset<T, ConnectorModelUpsertArgs<ExtArgs>>): Prisma__ConnectorModelClient<$Result.GetResult<Prisma.$ConnectorModelPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ConnectorModels.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelCountArgs} args - Arguments to filter ConnectorModels to count.
     * @example
     * // Count the number of ConnectorModels
     * const count = await prisma.connectorModel.count({
     *   where: {
     *     // ... the filter for the ConnectorModels we want to count
     *   }
     * })
    **/
    count<T extends ConnectorModelCountArgs>(
      args?: Subset<T, ConnectorModelCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConnectorModelCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ConnectorModel.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConnectorModelAggregateArgs>(args: Subset<T, ConnectorModelAggregateArgs>): Prisma.PrismaPromise<GetConnectorModelAggregateType<T>>

    /**
     * Group by ConnectorModel.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorModelGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConnectorModelGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConnectorModelGroupByArgs['orderBy'] }
        : { orderBy?: ConnectorModelGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConnectorModelGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConnectorModelGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ConnectorModel model
   */
  readonly fields: ConnectorModelFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ConnectorModel.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConnectorModelClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    connector<T extends ConnectorDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ConnectorDefaultArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ConnectorModel model
   */ 
  interface ConnectorModelFieldRefs {
    readonly id: FieldRef<"ConnectorModel", 'String'>
    readonly connectorId: FieldRef<"ConnectorModel", 'String'>
    readonly provider: FieldRef<"ConnectorModel", 'ConnectorProvider'>
    readonly modelKey: FieldRef<"ConnectorModel", 'String'>
    readonly displayName: FieldRef<"ConnectorModel", 'String'>
    readonly lifecycle: FieldRef<"ConnectorModel", 'ModelLifecycle'>
    readonly supportsStreaming: FieldRef<"ConnectorModel", 'Boolean'>
    readonly supportsTools: FieldRef<"ConnectorModel", 'Boolean'>
    readonly supportsVision: FieldRef<"ConnectorModel", 'Boolean'>
    readonly supportsAudio: FieldRef<"ConnectorModel", 'Boolean'>
    readonly supportsStructuredOutput: FieldRef<"ConnectorModel", 'Boolean'>
    readonly maxContextTokens: FieldRef<"ConnectorModel", 'Int'>
    readonly syncedAt: FieldRef<"ConnectorModel", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ConnectorModel findUnique
   */
  export type ConnectorModelFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorModel to fetch.
     */
    where: ConnectorModelWhereUniqueInput
  }

  /**
   * ConnectorModel findUniqueOrThrow
   */
  export type ConnectorModelFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorModel to fetch.
     */
    where: ConnectorModelWhereUniqueInput
  }

  /**
   * ConnectorModel findFirst
   */
  export type ConnectorModelFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorModel to fetch.
     */
    where?: ConnectorModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorModels to fetch.
     */
    orderBy?: ConnectorModelOrderByWithRelationInput | ConnectorModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConnectorModels.
     */
    cursor?: ConnectorModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorModels.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConnectorModels.
     */
    distinct?: ConnectorModelScalarFieldEnum | ConnectorModelScalarFieldEnum[]
  }

  /**
   * ConnectorModel findFirstOrThrow
   */
  export type ConnectorModelFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorModel to fetch.
     */
    where?: ConnectorModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorModels to fetch.
     */
    orderBy?: ConnectorModelOrderByWithRelationInput | ConnectorModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConnectorModels.
     */
    cursor?: ConnectorModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorModels.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConnectorModels.
     */
    distinct?: ConnectorModelScalarFieldEnum | ConnectorModelScalarFieldEnum[]
  }

  /**
   * ConnectorModel findMany
   */
  export type ConnectorModelFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorModels to fetch.
     */
    where?: ConnectorModelWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorModels to fetch.
     */
    orderBy?: ConnectorModelOrderByWithRelationInput | ConnectorModelOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ConnectorModels.
     */
    cursor?: ConnectorModelWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorModels from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorModels.
     */
    skip?: number
    distinct?: ConnectorModelScalarFieldEnum | ConnectorModelScalarFieldEnum[]
  }

  /**
   * ConnectorModel create
   */
  export type ConnectorModelCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * The data needed to create a ConnectorModel.
     */
    data: XOR<ConnectorModelCreateInput, ConnectorModelUncheckedCreateInput>
  }

  /**
   * ConnectorModel createMany
   */
  export type ConnectorModelCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ConnectorModels.
     */
    data: ConnectorModelCreateManyInput | ConnectorModelCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ConnectorModel createManyAndReturn
   */
  export type ConnectorModelCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ConnectorModels.
     */
    data: ConnectorModelCreateManyInput | ConnectorModelCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ConnectorModel update
   */
  export type ConnectorModelUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * The data needed to update a ConnectorModel.
     */
    data: XOR<ConnectorModelUpdateInput, ConnectorModelUncheckedUpdateInput>
    /**
     * Choose, which ConnectorModel to update.
     */
    where: ConnectorModelWhereUniqueInput
  }

  /**
   * ConnectorModel updateMany
   */
  export type ConnectorModelUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ConnectorModels.
     */
    data: XOR<ConnectorModelUpdateManyMutationInput, ConnectorModelUncheckedUpdateManyInput>
    /**
     * Filter which ConnectorModels to update
     */
    where?: ConnectorModelWhereInput
  }

  /**
   * ConnectorModel upsert
   */
  export type ConnectorModelUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * The filter to search for the ConnectorModel to update in case it exists.
     */
    where: ConnectorModelWhereUniqueInput
    /**
     * In case the ConnectorModel found by the `where` argument doesn't exist, create a new ConnectorModel with this data.
     */
    create: XOR<ConnectorModelCreateInput, ConnectorModelUncheckedCreateInput>
    /**
     * In case the ConnectorModel was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConnectorModelUpdateInput, ConnectorModelUncheckedUpdateInput>
  }

  /**
   * ConnectorModel delete
   */
  export type ConnectorModelDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
    /**
     * Filter which ConnectorModel to delete.
     */
    where: ConnectorModelWhereUniqueInput
  }

  /**
   * ConnectorModel deleteMany
   */
  export type ConnectorModelDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConnectorModels to delete
     */
    where?: ConnectorModelWhereInput
  }

  /**
   * ConnectorModel without action
   */
  export type ConnectorModelDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorModel
     */
    select?: ConnectorModelSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorModelInclude<ExtArgs> | null
  }


  /**
   * Model ConnectorHealthEvent
   */

  export type AggregateConnectorHealthEvent = {
    _count: ConnectorHealthEventCountAggregateOutputType | null
    _avg: ConnectorHealthEventAvgAggregateOutputType | null
    _sum: ConnectorHealthEventSumAggregateOutputType | null
    _min: ConnectorHealthEventMinAggregateOutputType | null
    _max: ConnectorHealthEventMaxAggregateOutputType | null
  }

  export type ConnectorHealthEventAvgAggregateOutputType = {
    latencyMs: number | null
  }

  export type ConnectorHealthEventSumAggregateOutputType = {
    latencyMs: number | null
  }

  export type ConnectorHealthEventMinAggregateOutputType = {
    id: string | null
    connectorId: string | null
    status: $Enums.ConnectorStatus | null
    latencyMs: number | null
    errorMessage: string | null
    checkedAt: Date | null
  }

  export type ConnectorHealthEventMaxAggregateOutputType = {
    id: string | null
    connectorId: string | null
    status: $Enums.ConnectorStatus | null
    latencyMs: number | null
    errorMessage: string | null
    checkedAt: Date | null
  }

  export type ConnectorHealthEventCountAggregateOutputType = {
    id: number
    connectorId: number
    status: number
    latencyMs: number
    errorMessage: number
    checkedAt: number
    _all: number
  }


  export type ConnectorHealthEventAvgAggregateInputType = {
    latencyMs?: true
  }

  export type ConnectorHealthEventSumAggregateInputType = {
    latencyMs?: true
  }

  export type ConnectorHealthEventMinAggregateInputType = {
    id?: true
    connectorId?: true
    status?: true
    latencyMs?: true
    errorMessage?: true
    checkedAt?: true
  }

  export type ConnectorHealthEventMaxAggregateInputType = {
    id?: true
    connectorId?: true
    status?: true
    latencyMs?: true
    errorMessage?: true
    checkedAt?: true
  }

  export type ConnectorHealthEventCountAggregateInputType = {
    id?: true
    connectorId?: true
    status?: true
    latencyMs?: true
    errorMessage?: true
    checkedAt?: true
    _all?: true
  }

  export type ConnectorHealthEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConnectorHealthEvent to aggregate.
     */
    where?: ConnectorHealthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorHealthEvents to fetch.
     */
    orderBy?: ConnectorHealthEventOrderByWithRelationInput | ConnectorHealthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ConnectorHealthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorHealthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorHealthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ConnectorHealthEvents
    **/
    _count?: true | ConnectorHealthEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ConnectorHealthEventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ConnectorHealthEventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ConnectorHealthEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ConnectorHealthEventMaxAggregateInputType
  }

  export type GetConnectorHealthEventAggregateType<T extends ConnectorHealthEventAggregateArgs> = {
        [P in keyof T & keyof AggregateConnectorHealthEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateConnectorHealthEvent[P]>
      : GetScalarType<T[P], AggregateConnectorHealthEvent[P]>
  }




  export type ConnectorHealthEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ConnectorHealthEventWhereInput
    orderBy?: ConnectorHealthEventOrderByWithAggregationInput | ConnectorHealthEventOrderByWithAggregationInput[]
    by: ConnectorHealthEventScalarFieldEnum[] | ConnectorHealthEventScalarFieldEnum
    having?: ConnectorHealthEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ConnectorHealthEventCountAggregateInputType | true
    _avg?: ConnectorHealthEventAvgAggregateInputType
    _sum?: ConnectorHealthEventSumAggregateInputType
    _min?: ConnectorHealthEventMinAggregateInputType
    _max?: ConnectorHealthEventMaxAggregateInputType
  }

  export type ConnectorHealthEventGroupByOutputType = {
    id: string
    connectorId: string
    status: $Enums.ConnectorStatus
    latencyMs: number | null
    errorMessage: string | null
    checkedAt: Date
    _count: ConnectorHealthEventCountAggregateOutputType | null
    _avg: ConnectorHealthEventAvgAggregateOutputType | null
    _sum: ConnectorHealthEventSumAggregateOutputType | null
    _min: ConnectorHealthEventMinAggregateOutputType | null
    _max: ConnectorHealthEventMaxAggregateOutputType | null
  }

  type GetConnectorHealthEventGroupByPayload<T extends ConnectorHealthEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ConnectorHealthEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ConnectorHealthEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ConnectorHealthEventGroupByOutputType[P]>
            : GetScalarType<T[P], ConnectorHealthEventGroupByOutputType[P]>
        }
      >
    >


  export type ConnectorHealthEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    connectorId?: boolean
    status?: boolean
    latencyMs?: boolean
    errorMessage?: boolean
    checkedAt?: boolean
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connectorHealthEvent"]>

  export type ConnectorHealthEventSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    connectorId?: boolean
    status?: boolean
    latencyMs?: boolean
    errorMessage?: boolean
    checkedAt?: boolean
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["connectorHealthEvent"]>

  export type ConnectorHealthEventSelectScalar = {
    id?: boolean
    connectorId?: boolean
    status?: boolean
    latencyMs?: boolean
    errorMessage?: boolean
    checkedAt?: boolean
  }

  export type ConnectorHealthEventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }
  export type ConnectorHealthEventIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }

  export type $ConnectorHealthEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ConnectorHealthEvent"
    objects: {
      connector: Prisma.$ConnectorPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      connectorId: string
      status: $Enums.ConnectorStatus
      latencyMs: number | null
      errorMessage: string | null
      checkedAt: Date
    }, ExtArgs["result"]["connectorHealthEvent"]>
    composites: {}
  }

  type ConnectorHealthEventGetPayload<S extends boolean | null | undefined | ConnectorHealthEventDefaultArgs> = $Result.GetResult<Prisma.$ConnectorHealthEventPayload, S>

  type ConnectorHealthEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ConnectorHealthEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ConnectorHealthEventCountAggregateInputType | true
    }

  export interface ConnectorHealthEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ConnectorHealthEvent'], meta: { name: 'ConnectorHealthEvent' } }
    /**
     * Find zero or one ConnectorHealthEvent that matches the filter.
     * @param {ConnectorHealthEventFindUniqueArgs} args - Arguments to find a ConnectorHealthEvent
     * @example
     * // Get one ConnectorHealthEvent
     * const connectorHealthEvent = await prisma.connectorHealthEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ConnectorHealthEventFindUniqueArgs>(args: SelectSubset<T, ConnectorHealthEventFindUniqueArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ConnectorHealthEvent that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ConnectorHealthEventFindUniqueOrThrowArgs} args - Arguments to find a ConnectorHealthEvent
     * @example
     * // Get one ConnectorHealthEvent
     * const connectorHealthEvent = await prisma.connectorHealthEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ConnectorHealthEventFindUniqueOrThrowArgs>(args: SelectSubset<T, ConnectorHealthEventFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ConnectorHealthEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventFindFirstArgs} args - Arguments to find a ConnectorHealthEvent
     * @example
     * // Get one ConnectorHealthEvent
     * const connectorHealthEvent = await prisma.connectorHealthEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ConnectorHealthEventFindFirstArgs>(args?: SelectSubset<T, ConnectorHealthEventFindFirstArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ConnectorHealthEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventFindFirstOrThrowArgs} args - Arguments to find a ConnectorHealthEvent
     * @example
     * // Get one ConnectorHealthEvent
     * const connectorHealthEvent = await prisma.connectorHealthEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ConnectorHealthEventFindFirstOrThrowArgs>(args?: SelectSubset<T, ConnectorHealthEventFindFirstOrThrowArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ConnectorHealthEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ConnectorHealthEvents
     * const connectorHealthEvents = await prisma.connectorHealthEvent.findMany()
     * 
     * // Get first 10 ConnectorHealthEvents
     * const connectorHealthEvents = await prisma.connectorHealthEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const connectorHealthEventWithIdOnly = await prisma.connectorHealthEvent.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ConnectorHealthEventFindManyArgs>(args?: SelectSubset<T, ConnectorHealthEventFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ConnectorHealthEvent.
     * @param {ConnectorHealthEventCreateArgs} args - Arguments to create a ConnectorHealthEvent.
     * @example
     * // Create one ConnectorHealthEvent
     * const ConnectorHealthEvent = await prisma.connectorHealthEvent.create({
     *   data: {
     *     // ... data to create a ConnectorHealthEvent
     *   }
     * })
     * 
     */
    create<T extends ConnectorHealthEventCreateArgs>(args: SelectSubset<T, ConnectorHealthEventCreateArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ConnectorHealthEvents.
     * @param {ConnectorHealthEventCreateManyArgs} args - Arguments to create many ConnectorHealthEvents.
     * @example
     * // Create many ConnectorHealthEvents
     * const connectorHealthEvent = await prisma.connectorHealthEvent.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ConnectorHealthEventCreateManyArgs>(args?: SelectSubset<T, ConnectorHealthEventCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ConnectorHealthEvents and returns the data saved in the database.
     * @param {ConnectorHealthEventCreateManyAndReturnArgs} args - Arguments to create many ConnectorHealthEvents.
     * @example
     * // Create many ConnectorHealthEvents
     * const connectorHealthEvent = await prisma.connectorHealthEvent.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ConnectorHealthEvents and only return the `id`
     * const connectorHealthEventWithIdOnly = await prisma.connectorHealthEvent.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ConnectorHealthEventCreateManyAndReturnArgs>(args?: SelectSubset<T, ConnectorHealthEventCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ConnectorHealthEvent.
     * @param {ConnectorHealthEventDeleteArgs} args - Arguments to delete one ConnectorHealthEvent.
     * @example
     * // Delete one ConnectorHealthEvent
     * const ConnectorHealthEvent = await prisma.connectorHealthEvent.delete({
     *   where: {
     *     // ... filter to delete one ConnectorHealthEvent
     *   }
     * })
     * 
     */
    delete<T extends ConnectorHealthEventDeleteArgs>(args: SelectSubset<T, ConnectorHealthEventDeleteArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ConnectorHealthEvent.
     * @param {ConnectorHealthEventUpdateArgs} args - Arguments to update one ConnectorHealthEvent.
     * @example
     * // Update one ConnectorHealthEvent
     * const connectorHealthEvent = await prisma.connectorHealthEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ConnectorHealthEventUpdateArgs>(args: SelectSubset<T, ConnectorHealthEventUpdateArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ConnectorHealthEvents.
     * @param {ConnectorHealthEventDeleteManyArgs} args - Arguments to filter ConnectorHealthEvents to delete.
     * @example
     * // Delete a few ConnectorHealthEvents
     * const { count } = await prisma.connectorHealthEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ConnectorHealthEventDeleteManyArgs>(args?: SelectSubset<T, ConnectorHealthEventDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ConnectorHealthEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ConnectorHealthEvents
     * const connectorHealthEvent = await prisma.connectorHealthEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ConnectorHealthEventUpdateManyArgs>(args: SelectSubset<T, ConnectorHealthEventUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ConnectorHealthEvent.
     * @param {ConnectorHealthEventUpsertArgs} args - Arguments to update or create a ConnectorHealthEvent.
     * @example
     * // Update or create a ConnectorHealthEvent
     * const connectorHealthEvent = await prisma.connectorHealthEvent.upsert({
     *   create: {
     *     // ... data to create a ConnectorHealthEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ConnectorHealthEvent we want to update
     *   }
     * })
     */
    upsert<T extends ConnectorHealthEventUpsertArgs>(args: SelectSubset<T, ConnectorHealthEventUpsertArgs<ExtArgs>>): Prisma__ConnectorHealthEventClient<$Result.GetResult<Prisma.$ConnectorHealthEventPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ConnectorHealthEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventCountArgs} args - Arguments to filter ConnectorHealthEvents to count.
     * @example
     * // Count the number of ConnectorHealthEvents
     * const count = await prisma.connectorHealthEvent.count({
     *   where: {
     *     // ... the filter for the ConnectorHealthEvents we want to count
     *   }
     * })
    **/
    count<T extends ConnectorHealthEventCountArgs>(
      args?: Subset<T, ConnectorHealthEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ConnectorHealthEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ConnectorHealthEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ConnectorHealthEventAggregateArgs>(args: Subset<T, ConnectorHealthEventAggregateArgs>): Prisma.PrismaPromise<GetConnectorHealthEventAggregateType<T>>

    /**
     * Group by ConnectorHealthEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ConnectorHealthEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ConnectorHealthEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ConnectorHealthEventGroupByArgs['orderBy'] }
        : { orderBy?: ConnectorHealthEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ConnectorHealthEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetConnectorHealthEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ConnectorHealthEvent model
   */
  readonly fields: ConnectorHealthEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ConnectorHealthEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ConnectorHealthEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    connector<T extends ConnectorDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ConnectorDefaultArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ConnectorHealthEvent model
   */ 
  interface ConnectorHealthEventFieldRefs {
    readonly id: FieldRef<"ConnectorHealthEvent", 'String'>
    readonly connectorId: FieldRef<"ConnectorHealthEvent", 'String'>
    readonly status: FieldRef<"ConnectorHealthEvent", 'ConnectorStatus'>
    readonly latencyMs: FieldRef<"ConnectorHealthEvent", 'Int'>
    readonly errorMessage: FieldRef<"ConnectorHealthEvent", 'String'>
    readonly checkedAt: FieldRef<"ConnectorHealthEvent", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ConnectorHealthEvent findUnique
   */
  export type ConnectorHealthEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorHealthEvent to fetch.
     */
    where: ConnectorHealthEventWhereUniqueInput
  }

  /**
   * ConnectorHealthEvent findUniqueOrThrow
   */
  export type ConnectorHealthEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorHealthEvent to fetch.
     */
    where: ConnectorHealthEventWhereUniqueInput
  }

  /**
   * ConnectorHealthEvent findFirst
   */
  export type ConnectorHealthEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorHealthEvent to fetch.
     */
    where?: ConnectorHealthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorHealthEvents to fetch.
     */
    orderBy?: ConnectorHealthEventOrderByWithRelationInput | ConnectorHealthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConnectorHealthEvents.
     */
    cursor?: ConnectorHealthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorHealthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorHealthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConnectorHealthEvents.
     */
    distinct?: ConnectorHealthEventScalarFieldEnum | ConnectorHealthEventScalarFieldEnum[]
  }

  /**
   * ConnectorHealthEvent findFirstOrThrow
   */
  export type ConnectorHealthEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorHealthEvent to fetch.
     */
    where?: ConnectorHealthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorHealthEvents to fetch.
     */
    orderBy?: ConnectorHealthEventOrderByWithRelationInput | ConnectorHealthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ConnectorHealthEvents.
     */
    cursor?: ConnectorHealthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorHealthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorHealthEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ConnectorHealthEvents.
     */
    distinct?: ConnectorHealthEventScalarFieldEnum | ConnectorHealthEventScalarFieldEnum[]
  }

  /**
   * ConnectorHealthEvent findMany
   */
  export type ConnectorHealthEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * Filter, which ConnectorHealthEvents to fetch.
     */
    where?: ConnectorHealthEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ConnectorHealthEvents to fetch.
     */
    orderBy?: ConnectorHealthEventOrderByWithRelationInput | ConnectorHealthEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ConnectorHealthEvents.
     */
    cursor?: ConnectorHealthEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ConnectorHealthEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ConnectorHealthEvents.
     */
    skip?: number
    distinct?: ConnectorHealthEventScalarFieldEnum | ConnectorHealthEventScalarFieldEnum[]
  }

  /**
   * ConnectorHealthEvent create
   */
  export type ConnectorHealthEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * The data needed to create a ConnectorHealthEvent.
     */
    data: XOR<ConnectorHealthEventCreateInput, ConnectorHealthEventUncheckedCreateInput>
  }

  /**
   * ConnectorHealthEvent createMany
   */
  export type ConnectorHealthEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ConnectorHealthEvents.
     */
    data: ConnectorHealthEventCreateManyInput | ConnectorHealthEventCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ConnectorHealthEvent createManyAndReturn
   */
  export type ConnectorHealthEventCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ConnectorHealthEvents.
     */
    data: ConnectorHealthEventCreateManyInput | ConnectorHealthEventCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ConnectorHealthEvent update
   */
  export type ConnectorHealthEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * The data needed to update a ConnectorHealthEvent.
     */
    data: XOR<ConnectorHealthEventUpdateInput, ConnectorHealthEventUncheckedUpdateInput>
    /**
     * Choose, which ConnectorHealthEvent to update.
     */
    where: ConnectorHealthEventWhereUniqueInput
  }

  /**
   * ConnectorHealthEvent updateMany
   */
  export type ConnectorHealthEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ConnectorHealthEvents.
     */
    data: XOR<ConnectorHealthEventUpdateManyMutationInput, ConnectorHealthEventUncheckedUpdateManyInput>
    /**
     * Filter which ConnectorHealthEvents to update
     */
    where?: ConnectorHealthEventWhereInput
  }

  /**
   * ConnectorHealthEvent upsert
   */
  export type ConnectorHealthEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * The filter to search for the ConnectorHealthEvent to update in case it exists.
     */
    where: ConnectorHealthEventWhereUniqueInput
    /**
     * In case the ConnectorHealthEvent found by the `where` argument doesn't exist, create a new ConnectorHealthEvent with this data.
     */
    create: XOR<ConnectorHealthEventCreateInput, ConnectorHealthEventUncheckedCreateInput>
    /**
     * In case the ConnectorHealthEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ConnectorHealthEventUpdateInput, ConnectorHealthEventUncheckedUpdateInput>
  }

  /**
   * ConnectorHealthEvent delete
   */
  export type ConnectorHealthEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
    /**
     * Filter which ConnectorHealthEvent to delete.
     */
    where: ConnectorHealthEventWhereUniqueInput
  }

  /**
   * ConnectorHealthEvent deleteMany
   */
  export type ConnectorHealthEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ConnectorHealthEvents to delete
     */
    where?: ConnectorHealthEventWhereInput
  }

  /**
   * ConnectorHealthEvent without action
   */
  export type ConnectorHealthEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ConnectorHealthEvent
     */
    select?: ConnectorHealthEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ConnectorHealthEventInclude<ExtArgs> | null
  }


  /**
   * Model ModelSyncRun
   */

  export type AggregateModelSyncRun = {
    _count: ModelSyncRunCountAggregateOutputType | null
    _avg: ModelSyncRunAvgAggregateOutputType | null
    _sum: ModelSyncRunSumAggregateOutputType | null
    _min: ModelSyncRunMinAggregateOutputType | null
    _max: ModelSyncRunMaxAggregateOutputType | null
  }

  export type ModelSyncRunAvgAggregateOutputType = {
    modelsFound: number | null
    modelsAdded: number | null
    modelsRemoved: number | null
  }

  export type ModelSyncRunSumAggregateOutputType = {
    modelsFound: number | null
    modelsAdded: number | null
    modelsRemoved: number | null
  }

  export type ModelSyncRunMinAggregateOutputType = {
    id: string | null
    connectorId: string | null
    status: $Enums.ModelSyncStatus | null
    modelsFound: number | null
    modelsAdded: number | null
    modelsRemoved: number | null
    startedAt: Date | null
    completedAt: Date | null
    errorMessage: string | null
  }

  export type ModelSyncRunMaxAggregateOutputType = {
    id: string | null
    connectorId: string | null
    status: $Enums.ModelSyncStatus | null
    modelsFound: number | null
    modelsAdded: number | null
    modelsRemoved: number | null
    startedAt: Date | null
    completedAt: Date | null
    errorMessage: string | null
  }

  export type ModelSyncRunCountAggregateOutputType = {
    id: number
    connectorId: number
    status: number
    modelsFound: number
    modelsAdded: number
    modelsRemoved: number
    startedAt: number
    completedAt: number
    errorMessage: number
    _all: number
  }


  export type ModelSyncRunAvgAggregateInputType = {
    modelsFound?: true
    modelsAdded?: true
    modelsRemoved?: true
  }

  export type ModelSyncRunSumAggregateInputType = {
    modelsFound?: true
    modelsAdded?: true
    modelsRemoved?: true
  }

  export type ModelSyncRunMinAggregateInputType = {
    id?: true
    connectorId?: true
    status?: true
    modelsFound?: true
    modelsAdded?: true
    modelsRemoved?: true
    startedAt?: true
    completedAt?: true
    errorMessage?: true
  }

  export type ModelSyncRunMaxAggregateInputType = {
    id?: true
    connectorId?: true
    status?: true
    modelsFound?: true
    modelsAdded?: true
    modelsRemoved?: true
    startedAt?: true
    completedAt?: true
    errorMessage?: true
  }

  export type ModelSyncRunCountAggregateInputType = {
    id?: true
    connectorId?: true
    status?: true
    modelsFound?: true
    modelsAdded?: true
    modelsRemoved?: true
    startedAt?: true
    completedAt?: true
    errorMessage?: true
    _all?: true
  }

  export type ModelSyncRunAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ModelSyncRun to aggregate.
     */
    where?: ModelSyncRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelSyncRuns to fetch.
     */
    orderBy?: ModelSyncRunOrderByWithRelationInput | ModelSyncRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ModelSyncRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelSyncRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelSyncRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ModelSyncRuns
    **/
    _count?: true | ModelSyncRunCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ModelSyncRunAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ModelSyncRunSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ModelSyncRunMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ModelSyncRunMaxAggregateInputType
  }

  export type GetModelSyncRunAggregateType<T extends ModelSyncRunAggregateArgs> = {
        [P in keyof T & keyof AggregateModelSyncRun]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateModelSyncRun[P]>
      : GetScalarType<T[P], AggregateModelSyncRun[P]>
  }




  export type ModelSyncRunGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ModelSyncRunWhereInput
    orderBy?: ModelSyncRunOrderByWithAggregationInput | ModelSyncRunOrderByWithAggregationInput[]
    by: ModelSyncRunScalarFieldEnum[] | ModelSyncRunScalarFieldEnum
    having?: ModelSyncRunScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ModelSyncRunCountAggregateInputType | true
    _avg?: ModelSyncRunAvgAggregateInputType
    _sum?: ModelSyncRunSumAggregateInputType
    _min?: ModelSyncRunMinAggregateInputType
    _max?: ModelSyncRunMaxAggregateInputType
  }

  export type ModelSyncRunGroupByOutputType = {
    id: string
    connectorId: string
    status: $Enums.ModelSyncStatus
    modelsFound: number
    modelsAdded: number
    modelsRemoved: number
    startedAt: Date
    completedAt: Date | null
    errorMessage: string | null
    _count: ModelSyncRunCountAggregateOutputType | null
    _avg: ModelSyncRunAvgAggregateOutputType | null
    _sum: ModelSyncRunSumAggregateOutputType | null
    _min: ModelSyncRunMinAggregateOutputType | null
    _max: ModelSyncRunMaxAggregateOutputType | null
  }

  type GetModelSyncRunGroupByPayload<T extends ModelSyncRunGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ModelSyncRunGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ModelSyncRunGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ModelSyncRunGroupByOutputType[P]>
            : GetScalarType<T[P], ModelSyncRunGroupByOutputType[P]>
        }
      >
    >


  export type ModelSyncRunSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    connectorId?: boolean
    status?: boolean
    modelsFound?: boolean
    modelsAdded?: boolean
    modelsRemoved?: boolean
    startedAt?: boolean
    completedAt?: boolean
    errorMessage?: boolean
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["modelSyncRun"]>

  export type ModelSyncRunSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    connectorId?: boolean
    status?: boolean
    modelsFound?: boolean
    modelsAdded?: boolean
    modelsRemoved?: boolean
    startedAt?: boolean
    completedAt?: boolean
    errorMessage?: boolean
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["modelSyncRun"]>

  export type ModelSyncRunSelectScalar = {
    id?: boolean
    connectorId?: boolean
    status?: boolean
    modelsFound?: boolean
    modelsAdded?: boolean
    modelsRemoved?: boolean
    startedAt?: boolean
    completedAt?: boolean
    errorMessage?: boolean
  }

  export type ModelSyncRunInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }
  export type ModelSyncRunIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    connector?: boolean | ConnectorDefaultArgs<ExtArgs>
  }

  export type $ModelSyncRunPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ModelSyncRun"
    objects: {
      connector: Prisma.$ConnectorPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      connectorId: string
      status: $Enums.ModelSyncStatus
      modelsFound: number
      modelsAdded: number
      modelsRemoved: number
      startedAt: Date
      completedAt: Date | null
      errorMessage: string | null
    }, ExtArgs["result"]["modelSyncRun"]>
    composites: {}
  }

  type ModelSyncRunGetPayload<S extends boolean | null | undefined | ModelSyncRunDefaultArgs> = $Result.GetResult<Prisma.$ModelSyncRunPayload, S>

  type ModelSyncRunCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ModelSyncRunFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ModelSyncRunCountAggregateInputType | true
    }

  export interface ModelSyncRunDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ModelSyncRun'], meta: { name: 'ModelSyncRun' } }
    /**
     * Find zero or one ModelSyncRun that matches the filter.
     * @param {ModelSyncRunFindUniqueArgs} args - Arguments to find a ModelSyncRun
     * @example
     * // Get one ModelSyncRun
     * const modelSyncRun = await prisma.modelSyncRun.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ModelSyncRunFindUniqueArgs>(args: SelectSubset<T, ModelSyncRunFindUniqueArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ModelSyncRun that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ModelSyncRunFindUniqueOrThrowArgs} args - Arguments to find a ModelSyncRun
     * @example
     * // Get one ModelSyncRun
     * const modelSyncRun = await prisma.modelSyncRun.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ModelSyncRunFindUniqueOrThrowArgs>(args: SelectSubset<T, ModelSyncRunFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ModelSyncRun that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunFindFirstArgs} args - Arguments to find a ModelSyncRun
     * @example
     * // Get one ModelSyncRun
     * const modelSyncRun = await prisma.modelSyncRun.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ModelSyncRunFindFirstArgs>(args?: SelectSubset<T, ModelSyncRunFindFirstArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ModelSyncRun that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunFindFirstOrThrowArgs} args - Arguments to find a ModelSyncRun
     * @example
     * // Get one ModelSyncRun
     * const modelSyncRun = await prisma.modelSyncRun.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ModelSyncRunFindFirstOrThrowArgs>(args?: SelectSubset<T, ModelSyncRunFindFirstOrThrowArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ModelSyncRuns that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ModelSyncRuns
     * const modelSyncRuns = await prisma.modelSyncRun.findMany()
     * 
     * // Get first 10 ModelSyncRuns
     * const modelSyncRuns = await prisma.modelSyncRun.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const modelSyncRunWithIdOnly = await prisma.modelSyncRun.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ModelSyncRunFindManyArgs>(args?: SelectSubset<T, ModelSyncRunFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ModelSyncRun.
     * @param {ModelSyncRunCreateArgs} args - Arguments to create a ModelSyncRun.
     * @example
     * // Create one ModelSyncRun
     * const ModelSyncRun = await prisma.modelSyncRun.create({
     *   data: {
     *     // ... data to create a ModelSyncRun
     *   }
     * })
     * 
     */
    create<T extends ModelSyncRunCreateArgs>(args: SelectSubset<T, ModelSyncRunCreateArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ModelSyncRuns.
     * @param {ModelSyncRunCreateManyArgs} args - Arguments to create many ModelSyncRuns.
     * @example
     * // Create many ModelSyncRuns
     * const modelSyncRun = await prisma.modelSyncRun.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ModelSyncRunCreateManyArgs>(args?: SelectSubset<T, ModelSyncRunCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ModelSyncRuns and returns the data saved in the database.
     * @param {ModelSyncRunCreateManyAndReturnArgs} args - Arguments to create many ModelSyncRuns.
     * @example
     * // Create many ModelSyncRuns
     * const modelSyncRun = await prisma.modelSyncRun.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ModelSyncRuns and only return the `id`
     * const modelSyncRunWithIdOnly = await prisma.modelSyncRun.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ModelSyncRunCreateManyAndReturnArgs>(args?: SelectSubset<T, ModelSyncRunCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ModelSyncRun.
     * @param {ModelSyncRunDeleteArgs} args - Arguments to delete one ModelSyncRun.
     * @example
     * // Delete one ModelSyncRun
     * const ModelSyncRun = await prisma.modelSyncRun.delete({
     *   where: {
     *     // ... filter to delete one ModelSyncRun
     *   }
     * })
     * 
     */
    delete<T extends ModelSyncRunDeleteArgs>(args: SelectSubset<T, ModelSyncRunDeleteArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ModelSyncRun.
     * @param {ModelSyncRunUpdateArgs} args - Arguments to update one ModelSyncRun.
     * @example
     * // Update one ModelSyncRun
     * const modelSyncRun = await prisma.modelSyncRun.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ModelSyncRunUpdateArgs>(args: SelectSubset<T, ModelSyncRunUpdateArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ModelSyncRuns.
     * @param {ModelSyncRunDeleteManyArgs} args - Arguments to filter ModelSyncRuns to delete.
     * @example
     * // Delete a few ModelSyncRuns
     * const { count } = await prisma.modelSyncRun.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ModelSyncRunDeleteManyArgs>(args?: SelectSubset<T, ModelSyncRunDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ModelSyncRuns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ModelSyncRuns
     * const modelSyncRun = await prisma.modelSyncRun.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ModelSyncRunUpdateManyArgs>(args: SelectSubset<T, ModelSyncRunUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ModelSyncRun.
     * @param {ModelSyncRunUpsertArgs} args - Arguments to update or create a ModelSyncRun.
     * @example
     * // Update or create a ModelSyncRun
     * const modelSyncRun = await prisma.modelSyncRun.upsert({
     *   create: {
     *     // ... data to create a ModelSyncRun
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ModelSyncRun we want to update
     *   }
     * })
     */
    upsert<T extends ModelSyncRunUpsertArgs>(args: SelectSubset<T, ModelSyncRunUpsertArgs<ExtArgs>>): Prisma__ModelSyncRunClient<$Result.GetResult<Prisma.$ModelSyncRunPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ModelSyncRuns.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunCountArgs} args - Arguments to filter ModelSyncRuns to count.
     * @example
     * // Count the number of ModelSyncRuns
     * const count = await prisma.modelSyncRun.count({
     *   where: {
     *     // ... the filter for the ModelSyncRuns we want to count
     *   }
     * })
    **/
    count<T extends ModelSyncRunCountArgs>(
      args?: Subset<T, ModelSyncRunCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ModelSyncRunCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ModelSyncRun.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ModelSyncRunAggregateArgs>(args: Subset<T, ModelSyncRunAggregateArgs>): Prisma.PrismaPromise<GetModelSyncRunAggregateType<T>>

    /**
     * Group by ModelSyncRun.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ModelSyncRunGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ModelSyncRunGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ModelSyncRunGroupByArgs['orderBy'] }
        : { orderBy?: ModelSyncRunGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ModelSyncRunGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetModelSyncRunGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ModelSyncRun model
   */
  readonly fields: ModelSyncRunFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ModelSyncRun.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ModelSyncRunClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    connector<T extends ConnectorDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ConnectorDefaultArgs<ExtArgs>>): Prisma__ConnectorClient<$Result.GetResult<Prisma.$ConnectorPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ModelSyncRun model
   */ 
  interface ModelSyncRunFieldRefs {
    readonly id: FieldRef<"ModelSyncRun", 'String'>
    readonly connectorId: FieldRef<"ModelSyncRun", 'String'>
    readonly status: FieldRef<"ModelSyncRun", 'ModelSyncStatus'>
    readonly modelsFound: FieldRef<"ModelSyncRun", 'Int'>
    readonly modelsAdded: FieldRef<"ModelSyncRun", 'Int'>
    readonly modelsRemoved: FieldRef<"ModelSyncRun", 'Int'>
    readonly startedAt: FieldRef<"ModelSyncRun", 'DateTime'>
    readonly completedAt: FieldRef<"ModelSyncRun", 'DateTime'>
    readonly errorMessage: FieldRef<"ModelSyncRun", 'String'>
  }
    

  // Custom InputTypes
  /**
   * ModelSyncRun findUnique
   */
  export type ModelSyncRunFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * Filter, which ModelSyncRun to fetch.
     */
    where: ModelSyncRunWhereUniqueInput
  }

  /**
   * ModelSyncRun findUniqueOrThrow
   */
  export type ModelSyncRunFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * Filter, which ModelSyncRun to fetch.
     */
    where: ModelSyncRunWhereUniqueInput
  }

  /**
   * ModelSyncRun findFirst
   */
  export type ModelSyncRunFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * Filter, which ModelSyncRun to fetch.
     */
    where?: ModelSyncRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelSyncRuns to fetch.
     */
    orderBy?: ModelSyncRunOrderByWithRelationInput | ModelSyncRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ModelSyncRuns.
     */
    cursor?: ModelSyncRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelSyncRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelSyncRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ModelSyncRuns.
     */
    distinct?: ModelSyncRunScalarFieldEnum | ModelSyncRunScalarFieldEnum[]
  }

  /**
   * ModelSyncRun findFirstOrThrow
   */
  export type ModelSyncRunFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * Filter, which ModelSyncRun to fetch.
     */
    where?: ModelSyncRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelSyncRuns to fetch.
     */
    orderBy?: ModelSyncRunOrderByWithRelationInput | ModelSyncRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ModelSyncRuns.
     */
    cursor?: ModelSyncRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelSyncRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelSyncRuns.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ModelSyncRuns.
     */
    distinct?: ModelSyncRunScalarFieldEnum | ModelSyncRunScalarFieldEnum[]
  }

  /**
   * ModelSyncRun findMany
   */
  export type ModelSyncRunFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * Filter, which ModelSyncRuns to fetch.
     */
    where?: ModelSyncRunWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ModelSyncRuns to fetch.
     */
    orderBy?: ModelSyncRunOrderByWithRelationInput | ModelSyncRunOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ModelSyncRuns.
     */
    cursor?: ModelSyncRunWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ModelSyncRuns from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ModelSyncRuns.
     */
    skip?: number
    distinct?: ModelSyncRunScalarFieldEnum | ModelSyncRunScalarFieldEnum[]
  }

  /**
   * ModelSyncRun create
   */
  export type ModelSyncRunCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * The data needed to create a ModelSyncRun.
     */
    data: XOR<ModelSyncRunCreateInput, ModelSyncRunUncheckedCreateInput>
  }

  /**
   * ModelSyncRun createMany
   */
  export type ModelSyncRunCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ModelSyncRuns.
     */
    data: ModelSyncRunCreateManyInput | ModelSyncRunCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ModelSyncRun createManyAndReturn
   */
  export type ModelSyncRunCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ModelSyncRuns.
     */
    data: ModelSyncRunCreateManyInput | ModelSyncRunCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ModelSyncRun update
   */
  export type ModelSyncRunUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * The data needed to update a ModelSyncRun.
     */
    data: XOR<ModelSyncRunUpdateInput, ModelSyncRunUncheckedUpdateInput>
    /**
     * Choose, which ModelSyncRun to update.
     */
    where: ModelSyncRunWhereUniqueInput
  }

  /**
   * ModelSyncRun updateMany
   */
  export type ModelSyncRunUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ModelSyncRuns.
     */
    data: XOR<ModelSyncRunUpdateManyMutationInput, ModelSyncRunUncheckedUpdateManyInput>
    /**
     * Filter which ModelSyncRuns to update
     */
    where?: ModelSyncRunWhereInput
  }

  /**
   * ModelSyncRun upsert
   */
  export type ModelSyncRunUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * The filter to search for the ModelSyncRun to update in case it exists.
     */
    where: ModelSyncRunWhereUniqueInput
    /**
     * In case the ModelSyncRun found by the `where` argument doesn't exist, create a new ModelSyncRun with this data.
     */
    create: XOR<ModelSyncRunCreateInput, ModelSyncRunUncheckedCreateInput>
    /**
     * In case the ModelSyncRun was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ModelSyncRunUpdateInput, ModelSyncRunUncheckedUpdateInput>
  }

  /**
   * ModelSyncRun delete
   */
  export type ModelSyncRunDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
    /**
     * Filter which ModelSyncRun to delete.
     */
    where: ModelSyncRunWhereUniqueInput
  }

  /**
   * ModelSyncRun deleteMany
   */
  export type ModelSyncRunDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ModelSyncRuns to delete
     */
    where?: ModelSyncRunWhereInput
  }

  /**
   * ModelSyncRun without action
   */
  export type ModelSyncRunDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ModelSyncRun
     */
    select?: ModelSyncRunSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ModelSyncRunInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ConnectorScalarFieldEnum: {
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

  export type ConnectorScalarFieldEnum = (typeof ConnectorScalarFieldEnum)[keyof typeof ConnectorScalarFieldEnum]


  export const ConnectorModelScalarFieldEnum: {
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

  export type ConnectorModelScalarFieldEnum = (typeof ConnectorModelScalarFieldEnum)[keyof typeof ConnectorModelScalarFieldEnum]


  export const ConnectorHealthEventScalarFieldEnum: {
    id: 'id',
    connectorId: 'connectorId',
    status: 'status',
    latencyMs: 'latencyMs',
    errorMessage: 'errorMessage',
    checkedAt: 'checkedAt'
  };

  export type ConnectorHealthEventScalarFieldEnum = (typeof ConnectorHealthEventScalarFieldEnum)[keyof typeof ConnectorHealthEventScalarFieldEnum]


  export const ModelSyncRunScalarFieldEnum: {
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

  export type ModelSyncRunScalarFieldEnum = (typeof ModelSyncRunScalarFieldEnum)[keyof typeof ModelSyncRunScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'ConnectorProvider'
   */
  export type EnumConnectorProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectorProvider'>
    


  /**
   * Reference to a field of type 'ConnectorProvider[]'
   */
  export type ListEnumConnectorProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectorProvider[]'>
    


  /**
   * Reference to a field of type 'ConnectorStatus'
   */
  export type EnumConnectorStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectorStatus'>
    


  /**
   * Reference to a field of type 'ConnectorStatus[]'
   */
  export type ListEnumConnectorStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectorStatus[]'>
    


  /**
   * Reference to a field of type 'ConnectorAuthType'
   */
  export type EnumConnectorAuthTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectorAuthType'>
    


  /**
   * Reference to a field of type 'ConnectorAuthType[]'
   */
  export type ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ConnectorAuthType[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'ModelLifecycle'
   */
  export type EnumModelLifecycleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ModelLifecycle'>
    


  /**
   * Reference to a field of type 'ModelLifecycle[]'
   */
  export type ListEnumModelLifecycleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ModelLifecycle[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'ModelSyncStatus'
   */
  export type EnumModelSyncStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ModelSyncStatus'>
    


  /**
   * Reference to a field of type 'ModelSyncStatus[]'
   */
  export type ListEnumModelSyncStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ModelSyncStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type ConnectorWhereInput = {
    AND?: ConnectorWhereInput | ConnectorWhereInput[]
    OR?: ConnectorWhereInput[]
    NOT?: ConnectorWhereInput | ConnectorWhereInput[]
    id?: StringFilter<"Connector"> | string
    name?: StringFilter<"Connector"> | string
    provider?: EnumConnectorProviderFilter<"Connector"> | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFilter<"Connector"> | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFilter<"Connector"> | $Enums.ConnectorAuthType
    encryptedConfig?: StringNullableFilter<"Connector"> | string | null
    isEnabled?: BoolFilter<"Connector"> | boolean
    defaultModelId?: StringNullableFilter<"Connector"> | string | null
    baseUrl?: StringNullableFilter<"Connector"> | string | null
    region?: StringNullableFilter<"Connector"> | string | null
    createdAt?: DateTimeFilter<"Connector"> | Date | string
    updatedAt?: DateTimeFilter<"Connector"> | Date | string
    models?: ConnectorModelListRelationFilter
    healthEvents?: ConnectorHealthEventListRelationFilter
    syncRuns?: ModelSyncRunListRelationFilter
  }

  export type ConnectorOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    provider?: SortOrder
    status?: SortOrder
    authType?: SortOrder
    encryptedConfig?: SortOrderInput | SortOrder
    isEnabled?: SortOrder
    defaultModelId?: SortOrderInput | SortOrder
    baseUrl?: SortOrderInput | SortOrder
    region?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    models?: ConnectorModelOrderByRelationAggregateInput
    healthEvents?: ConnectorHealthEventOrderByRelationAggregateInput
    syncRuns?: ModelSyncRunOrderByRelationAggregateInput
  }

  export type ConnectorWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ConnectorWhereInput | ConnectorWhereInput[]
    OR?: ConnectorWhereInput[]
    NOT?: ConnectorWhereInput | ConnectorWhereInput[]
    name?: StringFilter<"Connector"> | string
    provider?: EnumConnectorProviderFilter<"Connector"> | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFilter<"Connector"> | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFilter<"Connector"> | $Enums.ConnectorAuthType
    encryptedConfig?: StringNullableFilter<"Connector"> | string | null
    isEnabled?: BoolFilter<"Connector"> | boolean
    defaultModelId?: StringNullableFilter<"Connector"> | string | null
    baseUrl?: StringNullableFilter<"Connector"> | string | null
    region?: StringNullableFilter<"Connector"> | string | null
    createdAt?: DateTimeFilter<"Connector"> | Date | string
    updatedAt?: DateTimeFilter<"Connector"> | Date | string
    models?: ConnectorModelListRelationFilter
    healthEvents?: ConnectorHealthEventListRelationFilter
    syncRuns?: ModelSyncRunListRelationFilter
  }, "id">

  export type ConnectorOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    provider?: SortOrder
    status?: SortOrder
    authType?: SortOrder
    encryptedConfig?: SortOrderInput | SortOrder
    isEnabled?: SortOrder
    defaultModelId?: SortOrderInput | SortOrder
    baseUrl?: SortOrderInput | SortOrder
    region?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ConnectorCountOrderByAggregateInput
    _max?: ConnectorMaxOrderByAggregateInput
    _min?: ConnectorMinOrderByAggregateInput
  }

  export type ConnectorScalarWhereWithAggregatesInput = {
    AND?: ConnectorScalarWhereWithAggregatesInput | ConnectorScalarWhereWithAggregatesInput[]
    OR?: ConnectorScalarWhereWithAggregatesInput[]
    NOT?: ConnectorScalarWhereWithAggregatesInput | ConnectorScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Connector"> | string
    name?: StringWithAggregatesFilter<"Connector"> | string
    provider?: EnumConnectorProviderWithAggregatesFilter<"Connector"> | $Enums.ConnectorProvider
    status?: EnumConnectorStatusWithAggregatesFilter<"Connector"> | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeWithAggregatesFilter<"Connector"> | $Enums.ConnectorAuthType
    encryptedConfig?: StringNullableWithAggregatesFilter<"Connector"> | string | null
    isEnabled?: BoolWithAggregatesFilter<"Connector"> | boolean
    defaultModelId?: StringNullableWithAggregatesFilter<"Connector"> | string | null
    baseUrl?: StringNullableWithAggregatesFilter<"Connector"> | string | null
    region?: StringNullableWithAggregatesFilter<"Connector"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Connector"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Connector"> | Date | string
  }

  export type ConnectorModelWhereInput = {
    AND?: ConnectorModelWhereInput | ConnectorModelWhereInput[]
    OR?: ConnectorModelWhereInput[]
    NOT?: ConnectorModelWhereInput | ConnectorModelWhereInput[]
    id?: StringFilter<"ConnectorModel"> | string
    connectorId?: StringFilter<"ConnectorModel"> | string
    provider?: EnumConnectorProviderFilter<"ConnectorModel"> | $Enums.ConnectorProvider
    modelKey?: StringFilter<"ConnectorModel"> | string
    displayName?: StringFilter<"ConnectorModel"> | string
    lifecycle?: EnumModelLifecycleFilter<"ConnectorModel"> | $Enums.ModelLifecycle
    supportsStreaming?: BoolFilter<"ConnectorModel"> | boolean
    supportsTools?: BoolFilter<"ConnectorModel"> | boolean
    supportsVision?: BoolFilter<"ConnectorModel"> | boolean
    supportsAudio?: BoolFilter<"ConnectorModel"> | boolean
    supportsStructuredOutput?: BoolFilter<"ConnectorModel"> | boolean
    maxContextTokens?: IntNullableFilter<"ConnectorModel"> | number | null
    syncedAt?: DateTimeFilter<"ConnectorModel"> | Date | string
    connector?: XOR<ConnectorRelationFilter, ConnectorWhereInput>
  }

  export type ConnectorModelOrderByWithRelationInput = {
    id?: SortOrder
    connectorId?: SortOrder
    provider?: SortOrder
    modelKey?: SortOrder
    displayName?: SortOrder
    lifecycle?: SortOrder
    supportsStreaming?: SortOrder
    supportsTools?: SortOrder
    supportsVision?: SortOrder
    supportsAudio?: SortOrder
    supportsStructuredOutput?: SortOrder
    maxContextTokens?: SortOrderInput | SortOrder
    syncedAt?: SortOrder
    connector?: ConnectorOrderByWithRelationInput
  }

  export type ConnectorModelWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    connectorId_modelKey?: ConnectorModelConnectorIdModelKeyCompoundUniqueInput
    AND?: ConnectorModelWhereInput | ConnectorModelWhereInput[]
    OR?: ConnectorModelWhereInput[]
    NOT?: ConnectorModelWhereInput | ConnectorModelWhereInput[]
    connectorId?: StringFilter<"ConnectorModel"> | string
    provider?: EnumConnectorProviderFilter<"ConnectorModel"> | $Enums.ConnectorProvider
    modelKey?: StringFilter<"ConnectorModel"> | string
    displayName?: StringFilter<"ConnectorModel"> | string
    lifecycle?: EnumModelLifecycleFilter<"ConnectorModel"> | $Enums.ModelLifecycle
    supportsStreaming?: BoolFilter<"ConnectorModel"> | boolean
    supportsTools?: BoolFilter<"ConnectorModel"> | boolean
    supportsVision?: BoolFilter<"ConnectorModel"> | boolean
    supportsAudio?: BoolFilter<"ConnectorModel"> | boolean
    supportsStructuredOutput?: BoolFilter<"ConnectorModel"> | boolean
    maxContextTokens?: IntNullableFilter<"ConnectorModel"> | number | null
    syncedAt?: DateTimeFilter<"ConnectorModel"> | Date | string
    connector?: XOR<ConnectorRelationFilter, ConnectorWhereInput>
  }, "id" | "connectorId_modelKey">

  export type ConnectorModelOrderByWithAggregationInput = {
    id?: SortOrder
    connectorId?: SortOrder
    provider?: SortOrder
    modelKey?: SortOrder
    displayName?: SortOrder
    lifecycle?: SortOrder
    supportsStreaming?: SortOrder
    supportsTools?: SortOrder
    supportsVision?: SortOrder
    supportsAudio?: SortOrder
    supportsStructuredOutput?: SortOrder
    maxContextTokens?: SortOrderInput | SortOrder
    syncedAt?: SortOrder
    _count?: ConnectorModelCountOrderByAggregateInput
    _avg?: ConnectorModelAvgOrderByAggregateInput
    _max?: ConnectorModelMaxOrderByAggregateInput
    _min?: ConnectorModelMinOrderByAggregateInput
    _sum?: ConnectorModelSumOrderByAggregateInput
  }

  export type ConnectorModelScalarWhereWithAggregatesInput = {
    AND?: ConnectorModelScalarWhereWithAggregatesInput | ConnectorModelScalarWhereWithAggregatesInput[]
    OR?: ConnectorModelScalarWhereWithAggregatesInput[]
    NOT?: ConnectorModelScalarWhereWithAggregatesInput | ConnectorModelScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ConnectorModel"> | string
    connectorId?: StringWithAggregatesFilter<"ConnectorModel"> | string
    provider?: EnumConnectorProviderWithAggregatesFilter<"ConnectorModel"> | $Enums.ConnectorProvider
    modelKey?: StringWithAggregatesFilter<"ConnectorModel"> | string
    displayName?: StringWithAggregatesFilter<"ConnectorModel"> | string
    lifecycle?: EnumModelLifecycleWithAggregatesFilter<"ConnectorModel"> | $Enums.ModelLifecycle
    supportsStreaming?: BoolWithAggregatesFilter<"ConnectorModel"> | boolean
    supportsTools?: BoolWithAggregatesFilter<"ConnectorModel"> | boolean
    supportsVision?: BoolWithAggregatesFilter<"ConnectorModel"> | boolean
    supportsAudio?: BoolWithAggregatesFilter<"ConnectorModel"> | boolean
    supportsStructuredOutput?: BoolWithAggregatesFilter<"ConnectorModel"> | boolean
    maxContextTokens?: IntNullableWithAggregatesFilter<"ConnectorModel"> | number | null
    syncedAt?: DateTimeWithAggregatesFilter<"ConnectorModel"> | Date | string
  }

  export type ConnectorHealthEventWhereInput = {
    AND?: ConnectorHealthEventWhereInput | ConnectorHealthEventWhereInput[]
    OR?: ConnectorHealthEventWhereInput[]
    NOT?: ConnectorHealthEventWhereInput | ConnectorHealthEventWhereInput[]
    id?: StringFilter<"ConnectorHealthEvent"> | string
    connectorId?: StringFilter<"ConnectorHealthEvent"> | string
    status?: EnumConnectorStatusFilter<"ConnectorHealthEvent"> | $Enums.ConnectorStatus
    latencyMs?: IntNullableFilter<"ConnectorHealthEvent"> | number | null
    errorMessage?: StringNullableFilter<"ConnectorHealthEvent"> | string | null
    checkedAt?: DateTimeFilter<"ConnectorHealthEvent"> | Date | string
    connector?: XOR<ConnectorRelationFilter, ConnectorWhereInput>
  }

  export type ConnectorHealthEventOrderByWithRelationInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    latencyMs?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    checkedAt?: SortOrder
    connector?: ConnectorOrderByWithRelationInput
  }

  export type ConnectorHealthEventWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ConnectorHealthEventWhereInput | ConnectorHealthEventWhereInput[]
    OR?: ConnectorHealthEventWhereInput[]
    NOT?: ConnectorHealthEventWhereInput | ConnectorHealthEventWhereInput[]
    connectorId?: StringFilter<"ConnectorHealthEvent"> | string
    status?: EnumConnectorStatusFilter<"ConnectorHealthEvent"> | $Enums.ConnectorStatus
    latencyMs?: IntNullableFilter<"ConnectorHealthEvent"> | number | null
    errorMessage?: StringNullableFilter<"ConnectorHealthEvent"> | string | null
    checkedAt?: DateTimeFilter<"ConnectorHealthEvent"> | Date | string
    connector?: XOR<ConnectorRelationFilter, ConnectorWhereInput>
  }, "id">

  export type ConnectorHealthEventOrderByWithAggregationInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    latencyMs?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    checkedAt?: SortOrder
    _count?: ConnectorHealthEventCountOrderByAggregateInput
    _avg?: ConnectorHealthEventAvgOrderByAggregateInput
    _max?: ConnectorHealthEventMaxOrderByAggregateInput
    _min?: ConnectorHealthEventMinOrderByAggregateInput
    _sum?: ConnectorHealthEventSumOrderByAggregateInput
  }

  export type ConnectorHealthEventScalarWhereWithAggregatesInput = {
    AND?: ConnectorHealthEventScalarWhereWithAggregatesInput | ConnectorHealthEventScalarWhereWithAggregatesInput[]
    OR?: ConnectorHealthEventScalarWhereWithAggregatesInput[]
    NOT?: ConnectorHealthEventScalarWhereWithAggregatesInput | ConnectorHealthEventScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ConnectorHealthEvent"> | string
    connectorId?: StringWithAggregatesFilter<"ConnectorHealthEvent"> | string
    status?: EnumConnectorStatusWithAggregatesFilter<"ConnectorHealthEvent"> | $Enums.ConnectorStatus
    latencyMs?: IntNullableWithAggregatesFilter<"ConnectorHealthEvent"> | number | null
    errorMessage?: StringNullableWithAggregatesFilter<"ConnectorHealthEvent"> | string | null
    checkedAt?: DateTimeWithAggregatesFilter<"ConnectorHealthEvent"> | Date | string
  }

  export type ModelSyncRunWhereInput = {
    AND?: ModelSyncRunWhereInput | ModelSyncRunWhereInput[]
    OR?: ModelSyncRunWhereInput[]
    NOT?: ModelSyncRunWhereInput | ModelSyncRunWhereInput[]
    id?: StringFilter<"ModelSyncRun"> | string
    connectorId?: StringFilter<"ModelSyncRun"> | string
    status?: EnumModelSyncStatusFilter<"ModelSyncRun"> | $Enums.ModelSyncStatus
    modelsFound?: IntFilter<"ModelSyncRun"> | number
    modelsAdded?: IntFilter<"ModelSyncRun"> | number
    modelsRemoved?: IntFilter<"ModelSyncRun"> | number
    startedAt?: DateTimeFilter<"ModelSyncRun"> | Date | string
    completedAt?: DateTimeNullableFilter<"ModelSyncRun"> | Date | string | null
    errorMessage?: StringNullableFilter<"ModelSyncRun"> | string | null
    connector?: XOR<ConnectorRelationFilter, ConnectorWhereInput>
  }

  export type ModelSyncRunOrderByWithRelationInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    connector?: ConnectorOrderByWithRelationInput
  }

  export type ModelSyncRunWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ModelSyncRunWhereInput | ModelSyncRunWhereInput[]
    OR?: ModelSyncRunWhereInput[]
    NOT?: ModelSyncRunWhereInput | ModelSyncRunWhereInput[]
    connectorId?: StringFilter<"ModelSyncRun"> | string
    status?: EnumModelSyncStatusFilter<"ModelSyncRun"> | $Enums.ModelSyncStatus
    modelsFound?: IntFilter<"ModelSyncRun"> | number
    modelsAdded?: IntFilter<"ModelSyncRun"> | number
    modelsRemoved?: IntFilter<"ModelSyncRun"> | number
    startedAt?: DateTimeFilter<"ModelSyncRun"> | Date | string
    completedAt?: DateTimeNullableFilter<"ModelSyncRun"> | Date | string | null
    errorMessage?: StringNullableFilter<"ModelSyncRun"> | string | null
    connector?: XOR<ConnectorRelationFilter, ConnectorWhereInput>
  }, "id">

  export type ModelSyncRunOrderByWithAggregationInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrderInput | SortOrder
    errorMessage?: SortOrderInput | SortOrder
    _count?: ModelSyncRunCountOrderByAggregateInput
    _avg?: ModelSyncRunAvgOrderByAggregateInput
    _max?: ModelSyncRunMaxOrderByAggregateInput
    _min?: ModelSyncRunMinOrderByAggregateInput
    _sum?: ModelSyncRunSumOrderByAggregateInput
  }

  export type ModelSyncRunScalarWhereWithAggregatesInput = {
    AND?: ModelSyncRunScalarWhereWithAggregatesInput | ModelSyncRunScalarWhereWithAggregatesInput[]
    OR?: ModelSyncRunScalarWhereWithAggregatesInput[]
    NOT?: ModelSyncRunScalarWhereWithAggregatesInput | ModelSyncRunScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ModelSyncRun"> | string
    connectorId?: StringWithAggregatesFilter<"ModelSyncRun"> | string
    status?: EnumModelSyncStatusWithAggregatesFilter<"ModelSyncRun"> | $Enums.ModelSyncStatus
    modelsFound?: IntWithAggregatesFilter<"ModelSyncRun"> | number
    modelsAdded?: IntWithAggregatesFilter<"ModelSyncRun"> | number
    modelsRemoved?: IntWithAggregatesFilter<"ModelSyncRun"> | number
    startedAt?: DateTimeWithAggregatesFilter<"ModelSyncRun"> | Date | string
    completedAt?: DateTimeNullableWithAggregatesFilter<"ModelSyncRun"> | Date | string | null
    errorMessage?: StringNullableWithAggregatesFilter<"ModelSyncRun"> | string | null
  }

  export type ConnectorCreateInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    models?: ConnectorModelCreateNestedManyWithoutConnectorInput
    healthEvents?: ConnectorHealthEventCreateNestedManyWithoutConnectorInput
    syncRuns?: ModelSyncRunCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorUncheckedCreateInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    models?: ConnectorModelUncheckedCreateNestedManyWithoutConnectorInput
    healthEvents?: ConnectorHealthEventUncheckedCreateNestedManyWithoutConnectorInput
    syncRuns?: ModelSyncRunUncheckedCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    models?: ConnectorModelUpdateManyWithoutConnectorNestedInput
    healthEvents?: ConnectorHealthEventUpdateManyWithoutConnectorNestedInput
    syncRuns?: ModelSyncRunUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    models?: ConnectorModelUncheckedUpdateManyWithoutConnectorNestedInput
    healthEvents?: ConnectorHealthEventUncheckedUpdateManyWithoutConnectorNestedInput
    syncRuns?: ModelSyncRunUncheckedUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorCreateManyInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ConnectorUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorModelCreateInput = {
    id?: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle?: $Enums.ModelLifecycle
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: number | null
    syncedAt?: Date | string
    connector: ConnectorCreateNestedOneWithoutModelsInput
  }

  export type ConnectorModelUncheckedCreateInput = {
    id?: string
    connectorId: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle?: $Enums.ModelLifecycle
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: number | null
    syncedAt?: Date | string
  }

  export type ConnectorModelUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    connector?: ConnectorUpdateOneRequiredWithoutModelsNestedInput
  }

  export type ConnectorModelUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    connectorId?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorModelCreateManyInput = {
    id?: string
    connectorId: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle?: $Enums.ModelLifecycle
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: number | null
    syncedAt?: Date | string
  }

  export type ConnectorModelUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorModelUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    connectorId?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorHealthEventCreateInput = {
    id?: string
    status: $Enums.ConnectorStatus
    latencyMs?: number | null
    errorMessage?: string | null
    checkedAt?: Date | string
    connector: ConnectorCreateNestedOneWithoutHealthEventsInput
  }

  export type ConnectorHealthEventUncheckedCreateInput = {
    id?: string
    connectorId: string
    status: $Enums.ConnectorStatus
    latencyMs?: number | null
    errorMessage?: string | null
    checkedAt?: Date | string
  }

  export type ConnectorHealthEventUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    connector?: ConnectorUpdateOneRequiredWithoutHealthEventsNestedInput
  }

  export type ConnectorHealthEventUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    connectorId?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorHealthEventCreateManyInput = {
    id?: string
    connectorId: string
    status: $Enums.ConnectorStatus
    latencyMs?: number | null
    errorMessage?: string | null
    checkedAt?: Date | string
  }

  export type ConnectorHealthEventUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorHealthEventUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    connectorId?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ModelSyncRunCreateInput = {
    id?: string
    status: $Enums.ModelSyncStatus
    modelsFound?: number
    modelsAdded?: number
    modelsRemoved?: number
    startedAt?: Date | string
    completedAt?: Date | string | null
    errorMessage?: string | null
    connector: ConnectorCreateNestedOneWithoutSyncRunsInput
  }

  export type ModelSyncRunUncheckedCreateInput = {
    id?: string
    connectorId: string
    status: $Enums.ModelSyncStatus
    modelsFound?: number
    modelsAdded?: number
    modelsRemoved?: number
    startedAt?: Date | string
    completedAt?: Date | string | null
    errorMessage?: string | null
  }

  export type ModelSyncRunUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    connector?: ConnectorUpdateOneRequiredWithoutSyncRunsNestedInput
  }

  export type ModelSyncRunUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    connectorId?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ModelSyncRunCreateManyInput = {
    id?: string
    connectorId: string
    status: $Enums.ModelSyncStatus
    modelsFound?: number
    modelsAdded?: number
    modelsRemoved?: number
    startedAt?: Date | string
    completedAt?: Date | string | null
    errorMessage?: string | null
  }

  export type ModelSyncRunUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ModelSyncRunUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    connectorId?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumConnectorProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorProvider | EnumConnectorProviderFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorProviderFilter<$PrismaModel> | $Enums.ConnectorProvider
  }

  export type EnumConnectorStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorStatus | EnumConnectorStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorStatusFilter<$PrismaModel> | $Enums.ConnectorStatus
  }

  export type EnumConnectorAuthTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorAuthType | EnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorAuthTypeFilter<$PrismaModel> | $Enums.ConnectorAuthType
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type ConnectorModelListRelationFilter = {
    every?: ConnectorModelWhereInput
    some?: ConnectorModelWhereInput
    none?: ConnectorModelWhereInput
  }

  export type ConnectorHealthEventListRelationFilter = {
    every?: ConnectorHealthEventWhereInput
    some?: ConnectorHealthEventWhereInput
    none?: ConnectorHealthEventWhereInput
  }

  export type ModelSyncRunListRelationFilter = {
    every?: ModelSyncRunWhereInput
    some?: ModelSyncRunWhereInput
    none?: ModelSyncRunWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ConnectorModelOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConnectorHealthEventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ModelSyncRunOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ConnectorCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    provider?: SortOrder
    status?: SortOrder
    authType?: SortOrder
    encryptedConfig?: SortOrder
    isEnabled?: SortOrder
    defaultModelId?: SortOrder
    baseUrl?: SortOrder
    region?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConnectorMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    provider?: SortOrder
    status?: SortOrder
    authType?: SortOrder
    encryptedConfig?: SortOrder
    isEnabled?: SortOrder
    defaultModelId?: SortOrder
    baseUrl?: SortOrder
    region?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ConnectorMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    provider?: SortOrder
    status?: SortOrder
    authType?: SortOrder
    encryptedConfig?: SortOrder
    isEnabled?: SortOrder
    defaultModelId?: SortOrder
    baseUrl?: SortOrder
    region?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumConnectorProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorProvider | EnumConnectorProviderFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorProviderWithAggregatesFilter<$PrismaModel> | $Enums.ConnectorProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectorProviderFilter<$PrismaModel>
    _max?: NestedEnumConnectorProviderFilter<$PrismaModel>
  }

  export type EnumConnectorStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorStatus | EnumConnectorStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorStatusWithAggregatesFilter<$PrismaModel> | $Enums.ConnectorStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectorStatusFilter<$PrismaModel>
    _max?: NestedEnumConnectorStatusFilter<$PrismaModel>
  }

  export type EnumConnectorAuthTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorAuthType | EnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorAuthTypeWithAggregatesFilter<$PrismaModel> | $Enums.ConnectorAuthType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectorAuthTypeFilter<$PrismaModel>
    _max?: NestedEnumConnectorAuthTypeFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumModelLifecycleFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelLifecycle | EnumModelLifecycleFieldRefInput<$PrismaModel>
    in?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    not?: NestedEnumModelLifecycleFilter<$PrismaModel> | $Enums.ModelLifecycle
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type ConnectorRelationFilter = {
    is?: ConnectorWhereInput
    isNot?: ConnectorWhereInput
  }

  export type ConnectorModelConnectorIdModelKeyCompoundUniqueInput = {
    connectorId: string
    modelKey: string
  }

  export type ConnectorModelCountOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    provider?: SortOrder
    modelKey?: SortOrder
    displayName?: SortOrder
    lifecycle?: SortOrder
    supportsStreaming?: SortOrder
    supportsTools?: SortOrder
    supportsVision?: SortOrder
    supportsAudio?: SortOrder
    supportsStructuredOutput?: SortOrder
    maxContextTokens?: SortOrder
    syncedAt?: SortOrder
  }

  export type ConnectorModelAvgOrderByAggregateInput = {
    maxContextTokens?: SortOrder
  }

  export type ConnectorModelMaxOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    provider?: SortOrder
    modelKey?: SortOrder
    displayName?: SortOrder
    lifecycle?: SortOrder
    supportsStreaming?: SortOrder
    supportsTools?: SortOrder
    supportsVision?: SortOrder
    supportsAudio?: SortOrder
    supportsStructuredOutput?: SortOrder
    maxContextTokens?: SortOrder
    syncedAt?: SortOrder
  }

  export type ConnectorModelMinOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    provider?: SortOrder
    modelKey?: SortOrder
    displayName?: SortOrder
    lifecycle?: SortOrder
    supportsStreaming?: SortOrder
    supportsTools?: SortOrder
    supportsVision?: SortOrder
    supportsAudio?: SortOrder
    supportsStructuredOutput?: SortOrder
    maxContextTokens?: SortOrder
    syncedAt?: SortOrder
  }

  export type ConnectorModelSumOrderByAggregateInput = {
    maxContextTokens?: SortOrder
  }

  export type EnumModelLifecycleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelLifecycle | EnumModelLifecycleFieldRefInput<$PrismaModel>
    in?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    not?: NestedEnumModelLifecycleWithAggregatesFilter<$PrismaModel> | $Enums.ModelLifecycle
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumModelLifecycleFilter<$PrismaModel>
    _max?: NestedEnumModelLifecycleFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type ConnectorHealthEventCountOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    latencyMs?: SortOrder
    errorMessage?: SortOrder
    checkedAt?: SortOrder
  }

  export type ConnectorHealthEventAvgOrderByAggregateInput = {
    latencyMs?: SortOrder
  }

  export type ConnectorHealthEventMaxOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    latencyMs?: SortOrder
    errorMessage?: SortOrder
    checkedAt?: SortOrder
  }

  export type ConnectorHealthEventMinOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    latencyMs?: SortOrder
    errorMessage?: SortOrder
    checkedAt?: SortOrder
  }

  export type ConnectorHealthEventSumOrderByAggregateInput = {
    latencyMs?: SortOrder
  }

  export type EnumModelSyncStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelSyncStatus | EnumModelSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumModelSyncStatusFilter<$PrismaModel> | $Enums.ModelSyncStatus
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type ModelSyncRunCountOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    errorMessage?: SortOrder
  }

  export type ModelSyncRunAvgOrderByAggregateInput = {
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
  }

  export type ModelSyncRunMaxOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    errorMessage?: SortOrder
  }

  export type ModelSyncRunMinOrderByAggregateInput = {
    id?: SortOrder
    connectorId?: SortOrder
    status?: SortOrder
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
    startedAt?: SortOrder
    completedAt?: SortOrder
    errorMessage?: SortOrder
  }

  export type ModelSyncRunSumOrderByAggregateInput = {
    modelsFound?: SortOrder
    modelsAdded?: SortOrder
    modelsRemoved?: SortOrder
  }

  export type EnumModelSyncStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelSyncStatus | EnumModelSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumModelSyncStatusWithAggregatesFilter<$PrismaModel> | $Enums.ModelSyncStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumModelSyncStatusFilter<$PrismaModel>
    _max?: NestedEnumModelSyncStatusFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type ConnectorModelCreateNestedManyWithoutConnectorInput = {
    create?: XOR<ConnectorModelCreateWithoutConnectorInput, ConnectorModelUncheckedCreateWithoutConnectorInput> | ConnectorModelCreateWithoutConnectorInput[] | ConnectorModelUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorModelCreateOrConnectWithoutConnectorInput | ConnectorModelCreateOrConnectWithoutConnectorInput[]
    createMany?: ConnectorModelCreateManyConnectorInputEnvelope
    connect?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
  }

  export type ConnectorHealthEventCreateNestedManyWithoutConnectorInput = {
    create?: XOR<ConnectorHealthEventCreateWithoutConnectorInput, ConnectorHealthEventUncheckedCreateWithoutConnectorInput> | ConnectorHealthEventCreateWithoutConnectorInput[] | ConnectorHealthEventUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorHealthEventCreateOrConnectWithoutConnectorInput | ConnectorHealthEventCreateOrConnectWithoutConnectorInput[]
    createMany?: ConnectorHealthEventCreateManyConnectorInputEnvelope
    connect?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
  }

  export type ModelSyncRunCreateNestedManyWithoutConnectorInput = {
    create?: XOR<ModelSyncRunCreateWithoutConnectorInput, ModelSyncRunUncheckedCreateWithoutConnectorInput> | ModelSyncRunCreateWithoutConnectorInput[] | ModelSyncRunUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ModelSyncRunCreateOrConnectWithoutConnectorInput | ModelSyncRunCreateOrConnectWithoutConnectorInput[]
    createMany?: ModelSyncRunCreateManyConnectorInputEnvelope
    connect?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
  }

  export type ConnectorModelUncheckedCreateNestedManyWithoutConnectorInput = {
    create?: XOR<ConnectorModelCreateWithoutConnectorInput, ConnectorModelUncheckedCreateWithoutConnectorInput> | ConnectorModelCreateWithoutConnectorInput[] | ConnectorModelUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorModelCreateOrConnectWithoutConnectorInput | ConnectorModelCreateOrConnectWithoutConnectorInput[]
    createMany?: ConnectorModelCreateManyConnectorInputEnvelope
    connect?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
  }

  export type ConnectorHealthEventUncheckedCreateNestedManyWithoutConnectorInput = {
    create?: XOR<ConnectorHealthEventCreateWithoutConnectorInput, ConnectorHealthEventUncheckedCreateWithoutConnectorInput> | ConnectorHealthEventCreateWithoutConnectorInput[] | ConnectorHealthEventUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorHealthEventCreateOrConnectWithoutConnectorInput | ConnectorHealthEventCreateOrConnectWithoutConnectorInput[]
    createMany?: ConnectorHealthEventCreateManyConnectorInputEnvelope
    connect?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
  }

  export type ModelSyncRunUncheckedCreateNestedManyWithoutConnectorInput = {
    create?: XOR<ModelSyncRunCreateWithoutConnectorInput, ModelSyncRunUncheckedCreateWithoutConnectorInput> | ModelSyncRunCreateWithoutConnectorInput[] | ModelSyncRunUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ModelSyncRunCreateOrConnectWithoutConnectorInput | ModelSyncRunCreateOrConnectWithoutConnectorInput[]
    createMany?: ModelSyncRunCreateManyConnectorInputEnvelope
    connect?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumConnectorProviderFieldUpdateOperationsInput = {
    set?: $Enums.ConnectorProvider
  }

  export type EnumConnectorStatusFieldUpdateOperationsInput = {
    set?: $Enums.ConnectorStatus
  }

  export type EnumConnectorAuthTypeFieldUpdateOperationsInput = {
    set?: $Enums.ConnectorAuthType
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ConnectorModelUpdateManyWithoutConnectorNestedInput = {
    create?: XOR<ConnectorModelCreateWithoutConnectorInput, ConnectorModelUncheckedCreateWithoutConnectorInput> | ConnectorModelCreateWithoutConnectorInput[] | ConnectorModelUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorModelCreateOrConnectWithoutConnectorInput | ConnectorModelCreateOrConnectWithoutConnectorInput[]
    upsert?: ConnectorModelUpsertWithWhereUniqueWithoutConnectorInput | ConnectorModelUpsertWithWhereUniqueWithoutConnectorInput[]
    createMany?: ConnectorModelCreateManyConnectorInputEnvelope
    set?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    disconnect?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    delete?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    connect?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    update?: ConnectorModelUpdateWithWhereUniqueWithoutConnectorInput | ConnectorModelUpdateWithWhereUniqueWithoutConnectorInput[]
    updateMany?: ConnectorModelUpdateManyWithWhereWithoutConnectorInput | ConnectorModelUpdateManyWithWhereWithoutConnectorInput[]
    deleteMany?: ConnectorModelScalarWhereInput | ConnectorModelScalarWhereInput[]
  }

  export type ConnectorHealthEventUpdateManyWithoutConnectorNestedInput = {
    create?: XOR<ConnectorHealthEventCreateWithoutConnectorInput, ConnectorHealthEventUncheckedCreateWithoutConnectorInput> | ConnectorHealthEventCreateWithoutConnectorInput[] | ConnectorHealthEventUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorHealthEventCreateOrConnectWithoutConnectorInput | ConnectorHealthEventCreateOrConnectWithoutConnectorInput[]
    upsert?: ConnectorHealthEventUpsertWithWhereUniqueWithoutConnectorInput | ConnectorHealthEventUpsertWithWhereUniqueWithoutConnectorInput[]
    createMany?: ConnectorHealthEventCreateManyConnectorInputEnvelope
    set?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    disconnect?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    delete?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    connect?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    update?: ConnectorHealthEventUpdateWithWhereUniqueWithoutConnectorInput | ConnectorHealthEventUpdateWithWhereUniqueWithoutConnectorInput[]
    updateMany?: ConnectorHealthEventUpdateManyWithWhereWithoutConnectorInput | ConnectorHealthEventUpdateManyWithWhereWithoutConnectorInput[]
    deleteMany?: ConnectorHealthEventScalarWhereInput | ConnectorHealthEventScalarWhereInput[]
  }

  export type ModelSyncRunUpdateManyWithoutConnectorNestedInput = {
    create?: XOR<ModelSyncRunCreateWithoutConnectorInput, ModelSyncRunUncheckedCreateWithoutConnectorInput> | ModelSyncRunCreateWithoutConnectorInput[] | ModelSyncRunUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ModelSyncRunCreateOrConnectWithoutConnectorInput | ModelSyncRunCreateOrConnectWithoutConnectorInput[]
    upsert?: ModelSyncRunUpsertWithWhereUniqueWithoutConnectorInput | ModelSyncRunUpsertWithWhereUniqueWithoutConnectorInput[]
    createMany?: ModelSyncRunCreateManyConnectorInputEnvelope
    set?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    disconnect?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    delete?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    connect?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    update?: ModelSyncRunUpdateWithWhereUniqueWithoutConnectorInput | ModelSyncRunUpdateWithWhereUniqueWithoutConnectorInput[]
    updateMany?: ModelSyncRunUpdateManyWithWhereWithoutConnectorInput | ModelSyncRunUpdateManyWithWhereWithoutConnectorInput[]
    deleteMany?: ModelSyncRunScalarWhereInput | ModelSyncRunScalarWhereInput[]
  }

  export type ConnectorModelUncheckedUpdateManyWithoutConnectorNestedInput = {
    create?: XOR<ConnectorModelCreateWithoutConnectorInput, ConnectorModelUncheckedCreateWithoutConnectorInput> | ConnectorModelCreateWithoutConnectorInput[] | ConnectorModelUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorModelCreateOrConnectWithoutConnectorInput | ConnectorModelCreateOrConnectWithoutConnectorInput[]
    upsert?: ConnectorModelUpsertWithWhereUniqueWithoutConnectorInput | ConnectorModelUpsertWithWhereUniqueWithoutConnectorInput[]
    createMany?: ConnectorModelCreateManyConnectorInputEnvelope
    set?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    disconnect?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    delete?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    connect?: ConnectorModelWhereUniqueInput | ConnectorModelWhereUniqueInput[]
    update?: ConnectorModelUpdateWithWhereUniqueWithoutConnectorInput | ConnectorModelUpdateWithWhereUniqueWithoutConnectorInput[]
    updateMany?: ConnectorModelUpdateManyWithWhereWithoutConnectorInput | ConnectorModelUpdateManyWithWhereWithoutConnectorInput[]
    deleteMany?: ConnectorModelScalarWhereInput | ConnectorModelScalarWhereInput[]
  }

  export type ConnectorHealthEventUncheckedUpdateManyWithoutConnectorNestedInput = {
    create?: XOR<ConnectorHealthEventCreateWithoutConnectorInput, ConnectorHealthEventUncheckedCreateWithoutConnectorInput> | ConnectorHealthEventCreateWithoutConnectorInput[] | ConnectorHealthEventUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ConnectorHealthEventCreateOrConnectWithoutConnectorInput | ConnectorHealthEventCreateOrConnectWithoutConnectorInput[]
    upsert?: ConnectorHealthEventUpsertWithWhereUniqueWithoutConnectorInput | ConnectorHealthEventUpsertWithWhereUniqueWithoutConnectorInput[]
    createMany?: ConnectorHealthEventCreateManyConnectorInputEnvelope
    set?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    disconnect?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    delete?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    connect?: ConnectorHealthEventWhereUniqueInput | ConnectorHealthEventWhereUniqueInput[]
    update?: ConnectorHealthEventUpdateWithWhereUniqueWithoutConnectorInput | ConnectorHealthEventUpdateWithWhereUniqueWithoutConnectorInput[]
    updateMany?: ConnectorHealthEventUpdateManyWithWhereWithoutConnectorInput | ConnectorHealthEventUpdateManyWithWhereWithoutConnectorInput[]
    deleteMany?: ConnectorHealthEventScalarWhereInput | ConnectorHealthEventScalarWhereInput[]
  }

  export type ModelSyncRunUncheckedUpdateManyWithoutConnectorNestedInput = {
    create?: XOR<ModelSyncRunCreateWithoutConnectorInput, ModelSyncRunUncheckedCreateWithoutConnectorInput> | ModelSyncRunCreateWithoutConnectorInput[] | ModelSyncRunUncheckedCreateWithoutConnectorInput[]
    connectOrCreate?: ModelSyncRunCreateOrConnectWithoutConnectorInput | ModelSyncRunCreateOrConnectWithoutConnectorInput[]
    upsert?: ModelSyncRunUpsertWithWhereUniqueWithoutConnectorInput | ModelSyncRunUpsertWithWhereUniqueWithoutConnectorInput[]
    createMany?: ModelSyncRunCreateManyConnectorInputEnvelope
    set?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    disconnect?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    delete?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    connect?: ModelSyncRunWhereUniqueInput | ModelSyncRunWhereUniqueInput[]
    update?: ModelSyncRunUpdateWithWhereUniqueWithoutConnectorInput | ModelSyncRunUpdateWithWhereUniqueWithoutConnectorInput[]
    updateMany?: ModelSyncRunUpdateManyWithWhereWithoutConnectorInput | ModelSyncRunUpdateManyWithWhereWithoutConnectorInput[]
    deleteMany?: ModelSyncRunScalarWhereInput | ModelSyncRunScalarWhereInput[]
  }

  export type ConnectorCreateNestedOneWithoutModelsInput = {
    create?: XOR<ConnectorCreateWithoutModelsInput, ConnectorUncheckedCreateWithoutModelsInput>
    connectOrCreate?: ConnectorCreateOrConnectWithoutModelsInput
    connect?: ConnectorWhereUniqueInput
  }

  export type EnumModelLifecycleFieldUpdateOperationsInput = {
    set?: $Enums.ModelLifecycle
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ConnectorUpdateOneRequiredWithoutModelsNestedInput = {
    create?: XOR<ConnectorCreateWithoutModelsInput, ConnectorUncheckedCreateWithoutModelsInput>
    connectOrCreate?: ConnectorCreateOrConnectWithoutModelsInput
    upsert?: ConnectorUpsertWithoutModelsInput
    connect?: ConnectorWhereUniqueInput
    update?: XOR<XOR<ConnectorUpdateToOneWithWhereWithoutModelsInput, ConnectorUpdateWithoutModelsInput>, ConnectorUncheckedUpdateWithoutModelsInput>
  }

  export type ConnectorCreateNestedOneWithoutHealthEventsInput = {
    create?: XOR<ConnectorCreateWithoutHealthEventsInput, ConnectorUncheckedCreateWithoutHealthEventsInput>
    connectOrCreate?: ConnectorCreateOrConnectWithoutHealthEventsInput
    connect?: ConnectorWhereUniqueInput
  }

  export type ConnectorUpdateOneRequiredWithoutHealthEventsNestedInput = {
    create?: XOR<ConnectorCreateWithoutHealthEventsInput, ConnectorUncheckedCreateWithoutHealthEventsInput>
    connectOrCreate?: ConnectorCreateOrConnectWithoutHealthEventsInput
    upsert?: ConnectorUpsertWithoutHealthEventsInput
    connect?: ConnectorWhereUniqueInput
    update?: XOR<XOR<ConnectorUpdateToOneWithWhereWithoutHealthEventsInput, ConnectorUpdateWithoutHealthEventsInput>, ConnectorUncheckedUpdateWithoutHealthEventsInput>
  }

  export type ConnectorCreateNestedOneWithoutSyncRunsInput = {
    create?: XOR<ConnectorCreateWithoutSyncRunsInput, ConnectorUncheckedCreateWithoutSyncRunsInput>
    connectOrCreate?: ConnectorCreateOrConnectWithoutSyncRunsInput
    connect?: ConnectorWhereUniqueInput
  }

  export type EnumModelSyncStatusFieldUpdateOperationsInput = {
    set?: $Enums.ModelSyncStatus
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type ConnectorUpdateOneRequiredWithoutSyncRunsNestedInput = {
    create?: XOR<ConnectorCreateWithoutSyncRunsInput, ConnectorUncheckedCreateWithoutSyncRunsInput>
    connectOrCreate?: ConnectorCreateOrConnectWithoutSyncRunsInput
    upsert?: ConnectorUpsertWithoutSyncRunsInput
    connect?: ConnectorWhereUniqueInput
    update?: XOR<XOR<ConnectorUpdateToOneWithWhereWithoutSyncRunsInput, ConnectorUpdateWithoutSyncRunsInput>, ConnectorUncheckedUpdateWithoutSyncRunsInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumConnectorProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorProvider | EnumConnectorProviderFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorProviderFilter<$PrismaModel> | $Enums.ConnectorProvider
  }

  export type NestedEnumConnectorStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorStatus | EnumConnectorStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorStatusFilter<$PrismaModel> | $Enums.ConnectorStatus
  }

  export type NestedEnumConnectorAuthTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorAuthType | EnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorAuthTypeFilter<$PrismaModel> | $Enums.ConnectorAuthType
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedEnumConnectorProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorProvider | EnumConnectorProviderFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorProvider[] | ListEnumConnectorProviderFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorProviderWithAggregatesFilter<$PrismaModel> | $Enums.ConnectorProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectorProviderFilter<$PrismaModel>
    _max?: NestedEnumConnectorProviderFilter<$PrismaModel>
  }

  export type NestedEnumConnectorStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorStatus | EnumConnectorStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorStatus[] | ListEnumConnectorStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorStatusWithAggregatesFilter<$PrismaModel> | $Enums.ConnectorStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectorStatusFilter<$PrismaModel>
    _max?: NestedEnumConnectorStatusFilter<$PrismaModel>
  }

  export type NestedEnumConnectorAuthTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ConnectorAuthType | EnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ConnectorAuthType[] | ListEnumConnectorAuthTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumConnectorAuthTypeWithAggregatesFilter<$PrismaModel> | $Enums.ConnectorAuthType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumConnectorAuthTypeFilter<$PrismaModel>
    _max?: NestedEnumConnectorAuthTypeFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumModelLifecycleFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelLifecycle | EnumModelLifecycleFieldRefInput<$PrismaModel>
    in?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    not?: NestedEnumModelLifecycleFilter<$PrismaModel> | $Enums.ModelLifecycle
  }

  export type NestedEnumModelLifecycleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelLifecycle | EnumModelLifecycleFieldRefInput<$PrismaModel>
    in?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelLifecycle[] | ListEnumModelLifecycleFieldRefInput<$PrismaModel>
    not?: NestedEnumModelLifecycleWithAggregatesFilter<$PrismaModel> | $Enums.ModelLifecycle
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumModelLifecycleFilter<$PrismaModel>
    _max?: NestedEnumModelLifecycleFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumModelSyncStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelSyncStatus | EnumModelSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumModelSyncStatusFilter<$PrismaModel> | $Enums.ModelSyncStatus
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumModelSyncStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ModelSyncStatus | EnumModelSyncStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ModelSyncStatus[] | ListEnumModelSyncStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumModelSyncStatusWithAggregatesFilter<$PrismaModel> | $Enums.ModelSyncStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumModelSyncStatusFilter<$PrismaModel>
    _max?: NestedEnumModelSyncStatusFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type ConnectorModelCreateWithoutConnectorInput = {
    id?: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle?: $Enums.ModelLifecycle
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: number | null
    syncedAt?: Date | string
  }

  export type ConnectorModelUncheckedCreateWithoutConnectorInput = {
    id?: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle?: $Enums.ModelLifecycle
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: number | null
    syncedAt?: Date | string
  }

  export type ConnectorModelCreateOrConnectWithoutConnectorInput = {
    where: ConnectorModelWhereUniqueInput
    create: XOR<ConnectorModelCreateWithoutConnectorInput, ConnectorModelUncheckedCreateWithoutConnectorInput>
  }

  export type ConnectorModelCreateManyConnectorInputEnvelope = {
    data: ConnectorModelCreateManyConnectorInput | ConnectorModelCreateManyConnectorInput[]
    skipDuplicates?: boolean
  }

  export type ConnectorHealthEventCreateWithoutConnectorInput = {
    id?: string
    status: $Enums.ConnectorStatus
    latencyMs?: number | null
    errorMessage?: string | null
    checkedAt?: Date | string
  }

  export type ConnectorHealthEventUncheckedCreateWithoutConnectorInput = {
    id?: string
    status: $Enums.ConnectorStatus
    latencyMs?: number | null
    errorMessage?: string | null
    checkedAt?: Date | string
  }

  export type ConnectorHealthEventCreateOrConnectWithoutConnectorInput = {
    where: ConnectorHealthEventWhereUniqueInput
    create: XOR<ConnectorHealthEventCreateWithoutConnectorInput, ConnectorHealthEventUncheckedCreateWithoutConnectorInput>
  }

  export type ConnectorHealthEventCreateManyConnectorInputEnvelope = {
    data: ConnectorHealthEventCreateManyConnectorInput | ConnectorHealthEventCreateManyConnectorInput[]
    skipDuplicates?: boolean
  }

  export type ModelSyncRunCreateWithoutConnectorInput = {
    id?: string
    status: $Enums.ModelSyncStatus
    modelsFound?: number
    modelsAdded?: number
    modelsRemoved?: number
    startedAt?: Date | string
    completedAt?: Date | string | null
    errorMessage?: string | null
  }

  export type ModelSyncRunUncheckedCreateWithoutConnectorInput = {
    id?: string
    status: $Enums.ModelSyncStatus
    modelsFound?: number
    modelsAdded?: number
    modelsRemoved?: number
    startedAt?: Date | string
    completedAt?: Date | string | null
    errorMessage?: string | null
  }

  export type ModelSyncRunCreateOrConnectWithoutConnectorInput = {
    where: ModelSyncRunWhereUniqueInput
    create: XOR<ModelSyncRunCreateWithoutConnectorInput, ModelSyncRunUncheckedCreateWithoutConnectorInput>
  }

  export type ModelSyncRunCreateManyConnectorInputEnvelope = {
    data: ModelSyncRunCreateManyConnectorInput | ModelSyncRunCreateManyConnectorInput[]
    skipDuplicates?: boolean
  }

  export type ConnectorModelUpsertWithWhereUniqueWithoutConnectorInput = {
    where: ConnectorModelWhereUniqueInput
    update: XOR<ConnectorModelUpdateWithoutConnectorInput, ConnectorModelUncheckedUpdateWithoutConnectorInput>
    create: XOR<ConnectorModelCreateWithoutConnectorInput, ConnectorModelUncheckedCreateWithoutConnectorInput>
  }

  export type ConnectorModelUpdateWithWhereUniqueWithoutConnectorInput = {
    where: ConnectorModelWhereUniqueInput
    data: XOR<ConnectorModelUpdateWithoutConnectorInput, ConnectorModelUncheckedUpdateWithoutConnectorInput>
  }

  export type ConnectorModelUpdateManyWithWhereWithoutConnectorInput = {
    where: ConnectorModelScalarWhereInput
    data: XOR<ConnectorModelUpdateManyMutationInput, ConnectorModelUncheckedUpdateManyWithoutConnectorInput>
  }

  export type ConnectorModelScalarWhereInput = {
    AND?: ConnectorModelScalarWhereInput | ConnectorModelScalarWhereInput[]
    OR?: ConnectorModelScalarWhereInput[]
    NOT?: ConnectorModelScalarWhereInput | ConnectorModelScalarWhereInput[]
    id?: StringFilter<"ConnectorModel"> | string
    connectorId?: StringFilter<"ConnectorModel"> | string
    provider?: EnumConnectorProviderFilter<"ConnectorModel"> | $Enums.ConnectorProvider
    modelKey?: StringFilter<"ConnectorModel"> | string
    displayName?: StringFilter<"ConnectorModel"> | string
    lifecycle?: EnumModelLifecycleFilter<"ConnectorModel"> | $Enums.ModelLifecycle
    supportsStreaming?: BoolFilter<"ConnectorModel"> | boolean
    supportsTools?: BoolFilter<"ConnectorModel"> | boolean
    supportsVision?: BoolFilter<"ConnectorModel"> | boolean
    supportsAudio?: BoolFilter<"ConnectorModel"> | boolean
    supportsStructuredOutput?: BoolFilter<"ConnectorModel"> | boolean
    maxContextTokens?: IntNullableFilter<"ConnectorModel"> | number | null
    syncedAt?: DateTimeFilter<"ConnectorModel"> | Date | string
  }

  export type ConnectorHealthEventUpsertWithWhereUniqueWithoutConnectorInput = {
    where: ConnectorHealthEventWhereUniqueInput
    update: XOR<ConnectorHealthEventUpdateWithoutConnectorInput, ConnectorHealthEventUncheckedUpdateWithoutConnectorInput>
    create: XOR<ConnectorHealthEventCreateWithoutConnectorInput, ConnectorHealthEventUncheckedCreateWithoutConnectorInput>
  }

  export type ConnectorHealthEventUpdateWithWhereUniqueWithoutConnectorInput = {
    where: ConnectorHealthEventWhereUniqueInput
    data: XOR<ConnectorHealthEventUpdateWithoutConnectorInput, ConnectorHealthEventUncheckedUpdateWithoutConnectorInput>
  }

  export type ConnectorHealthEventUpdateManyWithWhereWithoutConnectorInput = {
    where: ConnectorHealthEventScalarWhereInput
    data: XOR<ConnectorHealthEventUpdateManyMutationInput, ConnectorHealthEventUncheckedUpdateManyWithoutConnectorInput>
  }

  export type ConnectorHealthEventScalarWhereInput = {
    AND?: ConnectorHealthEventScalarWhereInput | ConnectorHealthEventScalarWhereInput[]
    OR?: ConnectorHealthEventScalarWhereInput[]
    NOT?: ConnectorHealthEventScalarWhereInput | ConnectorHealthEventScalarWhereInput[]
    id?: StringFilter<"ConnectorHealthEvent"> | string
    connectorId?: StringFilter<"ConnectorHealthEvent"> | string
    status?: EnumConnectorStatusFilter<"ConnectorHealthEvent"> | $Enums.ConnectorStatus
    latencyMs?: IntNullableFilter<"ConnectorHealthEvent"> | number | null
    errorMessage?: StringNullableFilter<"ConnectorHealthEvent"> | string | null
    checkedAt?: DateTimeFilter<"ConnectorHealthEvent"> | Date | string
  }

  export type ModelSyncRunUpsertWithWhereUniqueWithoutConnectorInput = {
    where: ModelSyncRunWhereUniqueInput
    update: XOR<ModelSyncRunUpdateWithoutConnectorInput, ModelSyncRunUncheckedUpdateWithoutConnectorInput>
    create: XOR<ModelSyncRunCreateWithoutConnectorInput, ModelSyncRunUncheckedCreateWithoutConnectorInput>
  }

  export type ModelSyncRunUpdateWithWhereUniqueWithoutConnectorInput = {
    where: ModelSyncRunWhereUniqueInput
    data: XOR<ModelSyncRunUpdateWithoutConnectorInput, ModelSyncRunUncheckedUpdateWithoutConnectorInput>
  }

  export type ModelSyncRunUpdateManyWithWhereWithoutConnectorInput = {
    where: ModelSyncRunScalarWhereInput
    data: XOR<ModelSyncRunUpdateManyMutationInput, ModelSyncRunUncheckedUpdateManyWithoutConnectorInput>
  }

  export type ModelSyncRunScalarWhereInput = {
    AND?: ModelSyncRunScalarWhereInput | ModelSyncRunScalarWhereInput[]
    OR?: ModelSyncRunScalarWhereInput[]
    NOT?: ModelSyncRunScalarWhereInput | ModelSyncRunScalarWhereInput[]
    id?: StringFilter<"ModelSyncRun"> | string
    connectorId?: StringFilter<"ModelSyncRun"> | string
    status?: EnumModelSyncStatusFilter<"ModelSyncRun"> | $Enums.ModelSyncStatus
    modelsFound?: IntFilter<"ModelSyncRun"> | number
    modelsAdded?: IntFilter<"ModelSyncRun"> | number
    modelsRemoved?: IntFilter<"ModelSyncRun"> | number
    startedAt?: DateTimeFilter<"ModelSyncRun"> | Date | string
    completedAt?: DateTimeNullableFilter<"ModelSyncRun"> | Date | string | null
    errorMessage?: StringNullableFilter<"ModelSyncRun"> | string | null
  }

  export type ConnectorCreateWithoutModelsInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    healthEvents?: ConnectorHealthEventCreateNestedManyWithoutConnectorInput
    syncRuns?: ModelSyncRunCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorUncheckedCreateWithoutModelsInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    healthEvents?: ConnectorHealthEventUncheckedCreateNestedManyWithoutConnectorInput
    syncRuns?: ModelSyncRunUncheckedCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorCreateOrConnectWithoutModelsInput = {
    where: ConnectorWhereUniqueInput
    create: XOR<ConnectorCreateWithoutModelsInput, ConnectorUncheckedCreateWithoutModelsInput>
  }

  export type ConnectorUpsertWithoutModelsInput = {
    update: XOR<ConnectorUpdateWithoutModelsInput, ConnectorUncheckedUpdateWithoutModelsInput>
    create: XOR<ConnectorCreateWithoutModelsInput, ConnectorUncheckedCreateWithoutModelsInput>
    where?: ConnectorWhereInput
  }

  export type ConnectorUpdateToOneWithWhereWithoutModelsInput = {
    where?: ConnectorWhereInput
    data: XOR<ConnectorUpdateWithoutModelsInput, ConnectorUncheckedUpdateWithoutModelsInput>
  }

  export type ConnectorUpdateWithoutModelsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    healthEvents?: ConnectorHealthEventUpdateManyWithoutConnectorNestedInput
    syncRuns?: ModelSyncRunUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorUncheckedUpdateWithoutModelsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    healthEvents?: ConnectorHealthEventUncheckedUpdateManyWithoutConnectorNestedInput
    syncRuns?: ModelSyncRunUncheckedUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorCreateWithoutHealthEventsInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    models?: ConnectorModelCreateNestedManyWithoutConnectorInput
    syncRuns?: ModelSyncRunCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorUncheckedCreateWithoutHealthEventsInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    models?: ConnectorModelUncheckedCreateNestedManyWithoutConnectorInput
    syncRuns?: ModelSyncRunUncheckedCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorCreateOrConnectWithoutHealthEventsInput = {
    where: ConnectorWhereUniqueInput
    create: XOR<ConnectorCreateWithoutHealthEventsInput, ConnectorUncheckedCreateWithoutHealthEventsInput>
  }

  export type ConnectorUpsertWithoutHealthEventsInput = {
    update: XOR<ConnectorUpdateWithoutHealthEventsInput, ConnectorUncheckedUpdateWithoutHealthEventsInput>
    create: XOR<ConnectorCreateWithoutHealthEventsInput, ConnectorUncheckedCreateWithoutHealthEventsInput>
    where?: ConnectorWhereInput
  }

  export type ConnectorUpdateToOneWithWhereWithoutHealthEventsInput = {
    where?: ConnectorWhereInput
    data: XOR<ConnectorUpdateWithoutHealthEventsInput, ConnectorUncheckedUpdateWithoutHealthEventsInput>
  }

  export type ConnectorUpdateWithoutHealthEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    models?: ConnectorModelUpdateManyWithoutConnectorNestedInput
    syncRuns?: ModelSyncRunUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorUncheckedUpdateWithoutHealthEventsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    models?: ConnectorModelUncheckedUpdateManyWithoutConnectorNestedInput
    syncRuns?: ModelSyncRunUncheckedUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorCreateWithoutSyncRunsInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    models?: ConnectorModelCreateNestedManyWithoutConnectorInput
    healthEvents?: ConnectorHealthEventCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorUncheckedCreateWithoutSyncRunsInput = {
    id?: string
    name: string
    provider: $Enums.ConnectorProvider
    status?: $Enums.ConnectorStatus
    authType: $Enums.ConnectorAuthType
    encryptedConfig?: string | null
    isEnabled?: boolean
    defaultModelId?: string | null
    baseUrl?: string | null
    region?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    models?: ConnectorModelUncheckedCreateNestedManyWithoutConnectorInput
    healthEvents?: ConnectorHealthEventUncheckedCreateNestedManyWithoutConnectorInput
  }

  export type ConnectorCreateOrConnectWithoutSyncRunsInput = {
    where: ConnectorWhereUniqueInput
    create: XOR<ConnectorCreateWithoutSyncRunsInput, ConnectorUncheckedCreateWithoutSyncRunsInput>
  }

  export type ConnectorUpsertWithoutSyncRunsInput = {
    update: XOR<ConnectorUpdateWithoutSyncRunsInput, ConnectorUncheckedUpdateWithoutSyncRunsInput>
    create: XOR<ConnectorCreateWithoutSyncRunsInput, ConnectorUncheckedCreateWithoutSyncRunsInput>
    where?: ConnectorWhereInput
  }

  export type ConnectorUpdateToOneWithWhereWithoutSyncRunsInput = {
    where?: ConnectorWhereInput
    data: XOR<ConnectorUpdateWithoutSyncRunsInput, ConnectorUncheckedUpdateWithoutSyncRunsInput>
  }

  export type ConnectorUpdateWithoutSyncRunsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    models?: ConnectorModelUpdateManyWithoutConnectorNestedInput
    healthEvents?: ConnectorHealthEventUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorUncheckedUpdateWithoutSyncRunsInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    authType?: EnumConnectorAuthTypeFieldUpdateOperationsInput | $Enums.ConnectorAuthType
    encryptedConfig?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    defaultModelId?: NullableStringFieldUpdateOperationsInput | string | null
    baseUrl?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    models?: ConnectorModelUncheckedUpdateManyWithoutConnectorNestedInput
    healthEvents?: ConnectorHealthEventUncheckedUpdateManyWithoutConnectorNestedInput
  }

  export type ConnectorModelCreateManyConnectorInput = {
    id?: string
    provider: $Enums.ConnectorProvider
    modelKey: string
    displayName: string
    lifecycle?: $Enums.ModelLifecycle
    supportsStreaming?: boolean
    supportsTools?: boolean
    supportsVision?: boolean
    supportsAudio?: boolean
    supportsStructuredOutput?: boolean
    maxContextTokens?: number | null
    syncedAt?: Date | string
  }

  export type ConnectorHealthEventCreateManyConnectorInput = {
    id?: string
    status: $Enums.ConnectorStatus
    latencyMs?: number | null
    errorMessage?: string | null
    checkedAt?: Date | string
  }

  export type ModelSyncRunCreateManyConnectorInput = {
    id?: string
    status: $Enums.ModelSyncStatus
    modelsFound?: number
    modelsAdded?: number
    modelsRemoved?: number
    startedAt?: Date | string
    completedAt?: Date | string | null
    errorMessage?: string | null
  }

  export type ConnectorModelUpdateWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorModelUncheckedUpdateWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorModelUncheckedUpdateManyWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    provider?: EnumConnectorProviderFieldUpdateOperationsInput | $Enums.ConnectorProvider
    modelKey?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    lifecycle?: EnumModelLifecycleFieldUpdateOperationsInput | $Enums.ModelLifecycle
    supportsStreaming?: BoolFieldUpdateOperationsInput | boolean
    supportsTools?: BoolFieldUpdateOperationsInput | boolean
    supportsVision?: BoolFieldUpdateOperationsInput | boolean
    supportsAudio?: BoolFieldUpdateOperationsInput | boolean
    supportsStructuredOutput?: BoolFieldUpdateOperationsInput | boolean
    maxContextTokens?: NullableIntFieldUpdateOperationsInput | number | null
    syncedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorHealthEventUpdateWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorHealthEventUncheckedUpdateWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ConnectorHealthEventUncheckedUpdateManyWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumConnectorStatusFieldUpdateOperationsInput | $Enums.ConnectorStatus
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
    checkedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ModelSyncRunUpdateWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ModelSyncRunUncheckedUpdateWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ModelSyncRunUncheckedUpdateManyWithoutConnectorInput = {
    id?: StringFieldUpdateOperationsInput | string
    status?: EnumModelSyncStatusFieldUpdateOperationsInput | $Enums.ModelSyncStatus
    modelsFound?: IntFieldUpdateOperationsInput | number
    modelsAdded?: IntFieldUpdateOperationsInput | number
    modelsRemoved?: IntFieldUpdateOperationsInput | number
    startedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    errorMessage?: NullableStringFieldUpdateOperationsInput | string | null
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ConnectorCountOutputTypeDefaultArgs instead
     */
    export type ConnectorCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConnectorCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ConnectorDefaultArgs instead
     */
    export type ConnectorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConnectorDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ConnectorModelDefaultArgs instead
     */
    export type ConnectorModelArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConnectorModelDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ConnectorHealthEventDefaultArgs instead
     */
    export type ConnectorHealthEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ConnectorHealthEventDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ModelSyncRunDefaultArgs instead
     */
    export type ModelSyncRunArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ModelSyncRunDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}