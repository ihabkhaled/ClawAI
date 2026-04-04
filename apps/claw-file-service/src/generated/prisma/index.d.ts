
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
 * Model File
 * 
 */
export type File = $Result.DefaultSelection<Prisma.$FilePayload>
/**
 * Model FileChunk
 * 
 */
export type FileChunk = $Result.DefaultSelection<Prisma.$FileChunkPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const FileIngestionStatus: {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

export type FileIngestionStatus = (typeof FileIngestionStatus)[keyof typeof FileIngestionStatus]

}

export type FileIngestionStatus = $Enums.FileIngestionStatus

export const FileIngestionStatus: typeof $Enums.FileIngestionStatus

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Files
 * const files = await prisma.file.findMany()
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
   * // Fetch zero or more Files
   * const files = await prisma.file.findMany()
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
   * `prisma.file`: Exposes CRUD operations for the **File** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Files
    * const files = await prisma.file.findMany()
    * ```
    */
  get file(): Prisma.FileDelegate<ExtArgs>;

  /**
   * `prisma.fileChunk`: Exposes CRUD operations for the **FileChunk** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FileChunks
    * const fileChunks = await prisma.fileChunk.findMany()
    * ```
    */
  get fileChunk(): Prisma.FileChunkDelegate<ExtArgs>;
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
    File: 'File',
    FileChunk: 'FileChunk'
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
      modelProps: "file" | "fileChunk"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      File: {
        payload: Prisma.$FilePayload<ExtArgs>
        fields: Prisma.FileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>
          }
          findFirst: {
            args: Prisma.FileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>
          }
          findMany: {
            args: Prisma.FileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>[]
          }
          create: {
            args: Prisma.FileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>
          }
          createMany: {
            args: Prisma.FileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FileCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>[]
          }
          delete: {
            args: Prisma.FileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>
          }
          update: {
            args: Prisma.FileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>
          }
          deleteMany: {
            args: Prisma.FileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.FileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FilePayload>
          }
          aggregate: {
            args: Prisma.FileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFile>
          }
          groupBy: {
            args: Prisma.FileGroupByArgs<ExtArgs>
            result: $Utils.Optional<FileGroupByOutputType>[]
          }
          count: {
            args: Prisma.FileCountArgs<ExtArgs>
            result: $Utils.Optional<FileCountAggregateOutputType> | number
          }
        }
      }
      FileChunk: {
        payload: Prisma.$FileChunkPayload<ExtArgs>
        fields: Prisma.FileChunkFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FileChunkFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FileChunkFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>
          }
          findFirst: {
            args: Prisma.FileChunkFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FileChunkFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>
          }
          findMany: {
            args: Prisma.FileChunkFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>[]
          }
          create: {
            args: Prisma.FileChunkCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>
          }
          createMany: {
            args: Prisma.FileChunkCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FileChunkCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>[]
          }
          delete: {
            args: Prisma.FileChunkDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>
          }
          update: {
            args: Prisma.FileChunkUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>
          }
          deleteMany: {
            args: Prisma.FileChunkDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FileChunkUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.FileChunkUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileChunkPayload>
          }
          aggregate: {
            args: Prisma.FileChunkAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFileChunk>
          }
          groupBy: {
            args: Prisma.FileChunkGroupByArgs<ExtArgs>
            result: $Utils.Optional<FileChunkGroupByOutputType>[]
          }
          count: {
            args: Prisma.FileChunkCountArgs<ExtArgs>
            result: $Utils.Optional<FileChunkCountAggregateOutputType> | number
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
   * Count Type FileCountOutputType
   */

  export type FileCountOutputType = {
    chunks: number
  }

  export type FileCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chunks?: boolean | FileCountOutputTypeCountChunksArgs
  }

  // Custom InputTypes
  /**
   * FileCountOutputType without action
   */
  export type FileCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileCountOutputType
     */
    select?: FileCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * FileCountOutputType without action
   */
  export type FileCountOutputTypeCountChunksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FileChunkWhereInput
  }


  /**
   * Models
   */

  /**
   * Model File
   */

  export type AggregateFile = {
    _count: FileCountAggregateOutputType | null
    _avg: FileAvgAggregateOutputType | null
    _sum: FileSumAggregateOutputType | null
    _min: FileMinAggregateOutputType | null
    _max: FileMaxAggregateOutputType | null
  }

  export type FileAvgAggregateOutputType = {
    sizeBytes: number | null
  }

  export type FileSumAggregateOutputType = {
    sizeBytes: number | null
  }

  export type FileMinAggregateOutputType = {
    id: string | null
    userId: string | null
    filename: string | null
    mimeType: string | null
    sizeBytes: number | null
    storagePath: string | null
    ingestionStatus: $Enums.FileIngestionStatus | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FileMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    filename: string | null
    mimeType: string | null
    sizeBytes: number | null
    storagePath: string | null
    ingestionStatus: $Enums.FileIngestionStatus | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type FileCountAggregateOutputType = {
    id: number
    userId: number
    filename: number
    mimeType: number
    sizeBytes: number
    storagePath: number
    ingestionStatus: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type FileAvgAggregateInputType = {
    sizeBytes?: true
  }

  export type FileSumAggregateInputType = {
    sizeBytes?: true
  }

  export type FileMinAggregateInputType = {
    id?: true
    userId?: true
    filename?: true
    mimeType?: true
    sizeBytes?: true
    storagePath?: true
    ingestionStatus?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FileMaxAggregateInputType = {
    id?: true
    userId?: true
    filename?: true
    mimeType?: true
    sizeBytes?: true
    storagePath?: true
    ingestionStatus?: true
    createdAt?: true
    updatedAt?: true
  }

  export type FileCountAggregateInputType = {
    id?: true
    userId?: true
    filename?: true
    mimeType?: true
    sizeBytes?: true
    storagePath?: true
    ingestionStatus?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type FileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which File to aggregate.
     */
    where?: FileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Files to fetch.
     */
    orderBy?: FileOrderByWithRelationInput | FileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Files from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Files.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Files
    **/
    _count?: true | FileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FileMaxAggregateInputType
  }

  export type GetFileAggregateType<T extends FileAggregateArgs> = {
        [P in keyof T & keyof AggregateFile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFile[P]>
      : GetScalarType<T[P], AggregateFile[P]>
  }




  export type FileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FileWhereInput
    orderBy?: FileOrderByWithAggregationInput | FileOrderByWithAggregationInput[]
    by: FileScalarFieldEnum[] | FileScalarFieldEnum
    having?: FileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FileCountAggregateInputType | true
    _avg?: FileAvgAggregateInputType
    _sum?: FileSumAggregateInputType
    _min?: FileMinAggregateInputType
    _max?: FileMaxAggregateInputType
  }

  export type FileGroupByOutputType = {
    id: string
    userId: string
    filename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    ingestionStatus: $Enums.FileIngestionStatus
    createdAt: Date
    updatedAt: Date
    _count: FileCountAggregateOutputType | null
    _avg: FileAvgAggregateOutputType | null
    _sum: FileSumAggregateOutputType | null
    _min: FileMinAggregateOutputType | null
    _max: FileMaxAggregateOutputType | null
  }

  type GetFileGroupByPayload<T extends FileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FileGroupByOutputType[P]>
            : GetScalarType<T[P], FileGroupByOutputType[P]>
        }
      >
    >


  export type FileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    filename?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    storagePath?: boolean
    ingestionStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    chunks?: boolean | File$chunksArgs<ExtArgs>
    _count?: boolean | FileCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["file"]>

  export type FileSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    filename?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    storagePath?: boolean
    ingestionStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["file"]>

  export type FileSelectScalar = {
    id?: boolean
    userId?: boolean
    filename?: boolean
    mimeType?: boolean
    sizeBytes?: boolean
    storagePath?: boolean
    ingestionStatus?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type FileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chunks?: boolean | File$chunksArgs<ExtArgs>
    _count?: boolean | FileCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type FileIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $FilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "File"
    objects: {
      chunks: Prisma.$FileChunkPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      filename: string
      mimeType: string
      sizeBytes: number
      storagePath: string
      ingestionStatus: $Enums.FileIngestionStatus
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["file"]>
    composites: {}
  }

  type FileGetPayload<S extends boolean | null | undefined | FileDefaultArgs> = $Result.GetResult<Prisma.$FilePayload, S>

  type FileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<FileFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: FileCountAggregateInputType | true
    }

  export interface FileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['File'], meta: { name: 'File' } }
    /**
     * Find zero or one File that matches the filter.
     * @param {FileFindUniqueArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FileFindUniqueArgs>(args: SelectSubset<T, FileFindUniqueArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one File that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {FileFindUniqueOrThrowArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FileFindUniqueOrThrowArgs>(args: SelectSubset<T, FileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first File that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileFindFirstArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FileFindFirstArgs>(args?: SelectSubset<T, FileFindFirstArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first File that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileFindFirstOrThrowArgs} args - Arguments to find a File
     * @example
     * // Get one File
     * const file = await prisma.file.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FileFindFirstOrThrowArgs>(args?: SelectSubset<T, FileFindFirstOrThrowArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more Files that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Files
     * const files = await prisma.file.findMany()
     * 
     * // Get first 10 Files
     * const files = await prisma.file.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const fileWithIdOnly = await prisma.file.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FileFindManyArgs>(args?: SelectSubset<T, FileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a File.
     * @param {FileCreateArgs} args - Arguments to create a File.
     * @example
     * // Create one File
     * const File = await prisma.file.create({
     *   data: {
     *     // ... data to create a File
     *   }
     * })
     * 
     */
    create<T extends FileCreateArgs>(args: SelectSubset<T, FileCreateArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many Files.
     * @param {FileCreateManyArgs} args - Arguments to create many Files.
     * @example
     * // Create many Files
     * const file = await prisma.file.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FileCreateManyArgs>(args?: SelectSubset<T, FileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Files and returns the data saved in the database.
     * @param {FileCreateManyAndReturnArgs} args - Arguments to create many Files.
     * @example
     * // Create many Files
     * const file = await prisma.file.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Files and only return the `id`
     * const fileWithIdOnly = await prisma.file.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FileCreateManyAndReturnArgs>(args?: SelectSubset<T, FileCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a File.
     * @param {FileDeleteArgs} args - Arguments to delete one File.
     * @example
     * // Delete one File
     * const File = await prisma.file.delete({
     *   where: {
     *     // ... filter to delete one File
     *   }
     * })
     * 
     */
    delete<T extends FileDeleteArgs>(args: SelectSubset<T, FileDeleteArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one File.
     * @param {FileUpdateArgs} args - Arguments to update one File.
     * @example
     * // Update one File
     * const file = await prisma.file.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FileUpdateArgs>(args: SelectSubset<T, FileUpdateArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more Files.
     * @param {FileDeleteManyArgs} args - Arguments to filter Files to delete.
     * @example
     * // Delete a few Files
     * const { count } = await prisma.file.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FileDeleteManyArgs>(args?: SelectSubset<T, FileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Files.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Files
     * const file = await prisma.file.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FileUpdateManyArgs>(args: SelectSubset<T, FileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one File.
     * @param {FileUpsertArgs} args - Arguments to update or create a File.
     * @example
     * // Update or create a File
     * const file = await prisma.file.upsert({
     *   create: {
     *     // ... data to create a File
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the File we want to update
     *   }
     * })
     */
    upsert<T extends FileUpsertArgs>(args: SelectSubset<T, FileUpsertArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of Files.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileCountArgs} args - Arguments to filter Files to count.
     * @example
     * // Count the number of Files
     * const count = await prisma.file.count({
     *   where: {
     *     // ... the filter for the Files we want to count
     *   }
     * })
    **/
    count<T extends FileCountArgs>(
      args?: Subset<T, FileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a File.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends FileAggregateArgs>(args: Subset<T, FileAggregateArgs>): Prisma.PrismaPromise<GetFileAggregateType<T>>

    /**
     * Group by File.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileGroupByArgs} args - Group by arguments.
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
      T extends FileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FileGroupByArgs['orderBy'] }
        : { orderBy?: FileGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, FileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the File model
   */
  readonly fields: FileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for File.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    chunks<T extends File$chunksArgs<ExtArgs> = {}>(args?: Subset<T, File$chunksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the File model
   */ 
  interface FileFieldRefs {
    readonly id: FieldRef<"File", 'String'>
    readonly userId: FieldRef<"File", 'String'>
    readonly filename: FieldRef<"File", 'String'>
    readonly mimeType: FieldRef<"File", 'String'>
    readonly sizeBytes: FieldRef<"File", 'Int'>
    readonly storagePath: FieldRef<"File", 'String'>
    readonly ingestionStatus: FieldRef<"File", 'FileIngestionStatus'>
    readonly createdAt: FieldRef<"File", 'DateTime'>
    readonly updatedAt: FieldRef<"File", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * File findUnique
   */
  export type FileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * Filter, which File to fetch.
     */
    where: FileWhereUniqueInput
  }

  /**
   * File findUniqueOrThrow
   */
  export type FileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * Filter, which File to fetch.
     */
    where: FileWhereUniqueInput
  }

  /**
   * File findFirst
   */
  export type FileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * Filter, which File to fetch.
     */
    where?: FileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Files to fetch.
     */
    orderBy?: FileOrderByWithRelationInput | FileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Files.
     */
    cursor?: FileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Files from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Files.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Files.
     */
    distinct?: FileScalarFieldEnum | FileScalarFieldEnum[]
  }

  /**
   * File findFirstOrThrow
   */
  export type FileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * Filter, which File to fetch.
     */
    where?: FileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Files to fetch.
     */
    orderBy?: FileOrderByWithRelationInput | FileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Files.
     */
    cursor?: FileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Files from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Files.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Files.
     */
    distinct?: FileScalarFieldEnum | FileScalarFieldEnum[]
  }

  /**
   * File findMany
   */
  export type FileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * Filter, which Files to fetch.
     */
    where?: FileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Files to fetch.
     */
    orderBy?: FileOrderByWithRelationInput | FileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Files.
     */
    cursor?: FileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Files from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Files.
     */
    skip?: number
    distinct?: FileScalarFieldEnum | FileScalarFieldEnum[]
  }

  /**
   * File create
   */
  export type FileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * The data needed to create a File.
     */
    data: XOR<FileCreateInput, FileUncheckedCreateInput>
  }

  /**
   * File createMany
   */
  export type FileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Files.
     */
    data: FileCreateManyInput | FileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * File createManyAndReturn
   */
  export type FileCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many Files.
     */
    data: FileCreateManyInput | FileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * File update
   */
  export type FileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * The data needed to update a File.
     */
    data: XOR<FileUpdateInput, FileUncheckedUpdateInput>
    /**
     * Choose, which File to update.
     */
    where: FileWhereUniqueInput
  }

  /**
   * File updateMany
   */
  export type FileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Files.
     */
    data: XOR<FileUpdateManyMutationInput, FileUncheckedUpdateManyInput>
    /**
     * Filter which Files to update
     */
    where?: FileWhereInput
  }

  /**
   * File upsert
   */
  export type FileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * The filter to search for the File to update in case it exists.
     */
    where: FileWhereUniqueInput
    /**
     * In case the File found by the `where` argument doesn't exist, create a new File with this data.
     */
    create: XOR<FileCreateInput, FileUncheckedCreateInput>
    /**
     * In case the File was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FileUpdateInput, FileUncheckedUpdateInput>
  }

  /**
   * File delete
   */
  export type FileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
    /**
     * Filter which File to delete.
     */
    where: FileWhereUniqueInput
  }

  /**
   * File deleteMany
   */
  export type FileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Files to delete
     */
    where?: FileWhereInput
  }

  /**
   * File.chunks
   */
  export type File$chunksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    where?: FileChunkWhereInput
    orderBy?: FileChunkOrderByWithRelationInput | FileChunkOrderByWithRelationInput[]
    cursor?: FileChunkWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FileChunkScalarFieldEnum | FileChunkScalarFieldEnum[]
  }

  /**
   * File without action
   */
  export type FileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the File
     */
    select?: FileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileInclude<ExtArgs> | null
  }


  /**
   * Model FileChunk
   */

  export type AggregateFileChunk = {
    _count: FileChunkCountAggregateOutputType | null
    _avg: FileChunkAvgAggregateOutputType | null
    _sum: FileChunkSumAggregateOutputType | null
    _min: FileChunkMinAggregateOutputType | null
    _max: FileChunkMaxAggregateOutputType | null
  }

  export type FileChunkAvgAggregateOutputType = {
    chunkIndex: number | null
  }

  export type FileChunkSumAggregateOutputType = {
    chunkIndex: number | null
  }

  export type FileChunkMinAggregateOutputType = {
    id: string | null
    fileId: string | null
    chunkIndex: number | null
    content: string | null
    createdAt: Date | null
  }

  export type FileChunkMaxAggregateOutputType = {
    id: string | null
    fileId: string | null
    chunkIndex: number | null
    content: string | null
    createdAt: Date | null
  }

  export type FileChunkCountAggregateOutputType = {
    id: number
    fileId: number
    chunkIndex: number
    content: number
    createdAt: number
    _all: number
  }


  export type FileChunkAvgAggregateInputType = {
    chunkIndex?: true
  }

  export type FileChunkSumAggregateInputType = {
    chunkIndex?: true
  }

  export type FileChunkMinAggregateInputType = {
    id?: true
    fileId?: true
    chunkIndex?: true
    content?: true
    createdAt?: true
  }

  export type FileChunkMaxAggregateInputType = {
    id?: true
    fileId?: true
    chunkIndex?: true
    content?: true
    createdAt?: true
  }

  export type FileChunkCountAggregateInputType = {
    id?: true
    fileId?: true
    chunkIndex?: true
    content?: true
    createdAt?: true
    _all?: true
  }

  export type FileChunkAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FileChunk to aggregate.
     */
    where?: FileChunkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileChunks to fetch.
     */
    orderBy?: FileChunkOrderByWithRelationInput | FileChunkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FileChunkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileChunks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileChunks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FileChunks
    **/
    _count?: true | FileChunkCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FileChunkAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FileChunkSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FileChunkMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FileChunkMaxAggregateInputType
  }

  export type GetFileChunkAggregateType<T extends FileChunkAggregateArgs> = {
        [P in keyof T & keyof AggregateFileChunk]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFileChunk[P]>
      : GetScalarType<T[P], AggregateFileChunk[P]>
  }




  export type FileChunkGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FileChunkWhereInput
    orderBy?: FileChunkOrderByWithAggregationInput | FileChunkOrderByWithAggregationInput[]
    by: FileChunkScalarFieldEnum[] | FileChunkScalarFieldEnum
    having?: FileChunkScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FileChunkCountAggregateInputType | true
    _avg?: FileChunkAvgAggregateInputType
    _sum?: FileChunkSumAggregateInputType
    _min?: FileChunkMinAggregateInputType
    _max?: FileChunkMaxAggregateInputType
  }

  export type FileChunkGroupByOutputType = {
    id: string
    fileId: string
    chunkIndex: number
    content: string
    createdAt: Date
    _count: FileChunkCountAggregateOutputType | null
    _avg: FileChunkAvgAggregateOutputType | null
    _sum: FileChunkSumAggregateOutputType | null
    _min: FileChunkMinAggregateOutputType | null
    _max: FileChunkMaxAggregateOutputType | null
  }

  type GetFileChunkGroupByPayload<T extends FileChunkGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FileChunkGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FileChunkGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FileChunkGroupByOutputType[P]>
            : GetScalarType<T[P], FileChunkGroupByOutputType[P]>
        }
      >
    >


  export type FileChunkSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fileId?: boolean
    chunkIndex?: boolean
    content?: boolean
    createdAt?: boolean
    file?: boolean | FileDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fileChunk"]>

  export type FileChunkSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    fileId?: boolean
    chunkIndex?: boolean
    content?: boolean
    createdAt?: boolean
    file?: boolean | FileDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fileChunk"]>

  export type FileChunkSelectScalar = {
    id?: boolean
    fileId?: boolean
    chunkIndex?: boolean
    content?: boolean
    createdAt?: boolean
  }

  export type FileChunkInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    file?: boolean | FileDefaultArgs<ExtArgs>
  }
  export type FileChunkIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    file?: boolean | FileDefaultArgs<ExtArgs>
  }

  export type $FileChunkPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FileChunk"
    objects: {
      file: Prisma.$FilePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      fileId: string
      chunkIndex: number
      content: string
      createdAt: Date
    }, ExtArgs["result"]["fileChunk"]>
    composites: {}
  }

  type FileChunkGetPayload<S extends boolean | null | undefined | FileChunkDefaultArgs> = $Result.GetResult<Prisma.$FileChunkPayload, S>

  type FileChunkCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<FileChunkFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: FileChunkCountAggregateInputType | true
    }

  export interface FileChunkDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FileChunk'], meta: { name: 'FileChunk' } }
    /**
     * Find zero or one FileChunk that matches the filter.
     * @param {FileChunkFindUniqueArgs} args - Arguments to find a FileChunk
     * @example
     * // Get one FileChunk
     * const fileChunk = await prisma.fileChunk.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FileChunkFindUniqueArgs>(args: SelectSubset<T, FileChunkFindUniqueArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one FileChunk that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {FileChunkFindUniqueOrThrowArgs} args - Arguments to find a FileChunk
     * @example
     * // Get one FileChunk
     * const fileChunk = await prisma.fileChunk.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FileChunkFindUniqueOrThrowArgs>(args: SelectSubset<T, FileChunkFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first FileChunk that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkFindFirstArgs} args - Arguments to find a FileChunk
     * @example
     * // Get one FileChunk
     * const fileChunk = await prisma.fileChunk.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FileChunkFindFirstArgs>(args?: SelectSubset<T, FileChunkFindFirstArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first FileChunk that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkFindFirstOrThrowArgs} args - Arguments to find a FileChunk
     * @example
     * // Get one FileChunk
     * const fileChunk = await prisma.fileChunk.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FileChunkFindFirstOrThrowArgs>(args?: SelectSubset<T, FileChunkFindFirstOrThrowArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more FileChunks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FileChunks
     * const fileChunks = await prisma.fileChunk.findMany()
     * 
     * // Get first 10 FileChunks
     * const fileChunks = await prisma.fileChunk.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const fileChunkWithIdOnly = await prisma.fileChunk.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FileChunkFindManyArgs>(args?: SelectSubset<T, FileChunkFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a FileChunk.
     * @param {FileChunkCreateArgs} args - Arguments to create a FileChunk.
     * @example
     * // Create one FileChunk
     * const FileChunk = await prisma.fileChunk.create({
     *   data: {
     *     // ... data to create a FileChunk
     *   }
     * })
     * 
     */
    create<T extends FileChunkCreateArgs>(args: SelectSubset<T, FileChunkCreateArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many FileChunks.
     * @param {FileChunkCreateManyArgs} args - Arguments to create many FileChunks.
     * @example
     * // Create many FileChunks
     * const fileChunk = await prisma.fileChunk.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FileChunkCreateManyArgs>(args?: SelectSubset<T, FileChunkCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FileChunks and returns the data saved in the database.
     * @param {FileChunkCreateManyAndReturnArgs} args - Arguments to create many FileChunks.
     * @example
     * // Create many FileChunks
     * const fileChunk = await prisma.fileChunk.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FileChunks and only return the `id`
     * const fileChunkWithIdOnly = await prisma.fileChunk.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FileChunkCreateManyAndReturnArgs>(args?: SelectSubset<T, FileChunkCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a FileChunk.
     * @param {FileChunkDeleteArgs} args - Arguments to delete one FileChunk.
     * @example
     * // Delete one FileChunk
     * const FileChunk = await prisma.fileChunk.delete({
     *   where: {
     *     // ... filter to delete one FileChunk
     *   }
     * })
     * 
     */
    delete<T extends FileChunkDeleteArgs>(args: SelectSubset<T, FileChunkDeleteArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one FileChunk.
     * @param {FileChunkUpdateArgs} args - Arguments to update one FileChunk.
     * @example
     * // Update one FileChunk
     * const fileChunk = await prisma.fileChunk.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FileChunkUpdateArgs>(args: SelectSubset<T, FileChunkUpdateArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more FileChunks.
     * @param {FileChunkDeleteManyArgs} args - Arguments to filter FileChunks to delete.
     * @example
     * // Delete a few FileChunks
     * const { count } = await prisma.fileChunk.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FileChunkDeleteManyArgs>(args?: SelectSubset<T, FileChunkDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FileChunks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FileChunks
     * const fileChunk = await prisma.fileChunk.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FileChunkUpdateManyArgs>(args: SelectSubset<T, FileChunkUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one FileChunk.
     * @param {FileChunkUpsertArgs} args - Arguments to update or create a FileChunk.
     * @example
     * // Update or create a FileChunk
     * const fileChunk = await prisma.fileChunk.upsert({
     *   create: {
     *     // ... data to create a FileChunk
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FileChunk we want to update
     *   }
     * })
     */
    upsert<T extends FileChunkUpsertArgs>(args: SelectSubset<T, FileChunkUpsertArgs<ExtArgs>>): Prisma__FileChunkClient<$Result.GetResult<Prisma.$FileChunkPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of FileChunks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkCountArgs} args - Arguments to filter FileChunks to count.
     * @example
     * // Count the number of FileChunks
     * const count = await prisma.fileChunk.count({
     *   where: {
     *     // ... the filter for the FileChunks we want to count
     *   }
     * })
    **/
    count<T extends FileChunkCountArgs>(
      args?: Subset<T, FileChunkCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FileChunkCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FileChunk.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends FileChunkAggregateArgs>(args: Subset<T, FileChunkAggregateArgs>): Prisma.PrismaPromise<GetFileChunkAggregateType<T>>

    /**
     * Group by FileChunk.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileChunkGroupByArgs} args - Group by arguments.
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
      T extends FileChunkGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FileChunkGroupByArgs['orderBy'] }
        : { orderBy?: FileChunkGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, FileChunkGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFileChunkGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FileChunk model
   */
  readonly fields: FileChunkFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FileChunk.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FileChunkClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    file<T extends FileDefaultArgs<ExtArgs> = {}>(args?: Subset<T, FileDefaultArgs<ExtArgs>>): Prisma__FileClient<$Result.GetResult<Prisma.$FilePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the FileChunk model
   */ 
  interface FileChunkFieldRefs {
    readonly id: FieldRef<"FileChunk", 'String'>
    readonly fileId: FieldRef<"FileChunk", 'String'>
    readonly chunkIndex: FieldRef<"FileChunk", 'Int'>
    readonly content: FieldRef<"FileChunk", 'String'>
    readonly createdAt: FieldRef<"FileChunk", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FileChunk findUnique
   */
  export type FileChunkFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * Filter, which FileChunk to fetch.
     */
    where: FileChunkWhereUniqueInput
  }

  /**
   * FileChunk findUniqueOrThrow
   */
  export type FileChunkFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * Filter, which FileChunk to fetch.
     */
    where: FileChunkWhereUniqueInput
  }

  /**
   * FileChunk findFirst
   */
  export type FileChunkFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * Filter, which FileChunk to fetch.
     */
    where?: FileChunkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileChunks to fetch.
     */
    orderBy?: FileChunkOrderByWithRelationInput | FileChunkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FileChunks.
     */
    cursor?: FileChunkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileChunks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileChunks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FileChunks.
     */
    distinct?: FileChunkScalarFieldEnum | FileChunkScalarFieldEnum[]
  }

  /**
   * FileChunk findFirstOrThrow
   */
  export type FileChunkFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * Filter, which FileChunk to fetch.
     */
    where?: FileChunkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileChunks to fetch.
     */
    orderBy?: FileChunkOrderByWithRelationInput | FileChunkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FileChunks.
     */
    cursor?: FileChunkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileChunks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileChunks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FileChunks.
     */
    distinct?: FileChunkScalarFieldEnum | FileChunkScalarFieldEnum[]
  }

  /**
   * FileChunk findMany
   */
  export type FileChunkFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * Filter, which FileChunks to fetch.
     */
    where?: FileChunkWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileChunks to fetch.
     */
    orderBy?: FileChunkOrderByWithRelationInput | FileChunkOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FileChunks.
     */
    cursor?: FileChunkWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileChunks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileChunks.
     */
    skip?: number
    distinct?: FileChunkScalarFieldEnum | FileChunkScalarFieldEnum[]
  }

  /**
   * FileChunk create
   */
  export type FileChunkCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * The data needed to create a FileChunk.
     */
    data: XOR<FileChunkCreateInput, FileChunkUncheckedCreateInput>
  }

  /**
   * FileChunk createMany
   */
  export type FileChunkCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FileChunks.
     */
    data: FileChunkCreateManyInput | FileChunkCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FileChunk createManyAndReturn
   */
  export type FileChunkCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many FileChunks.
     */
    data: FileChunkCreateManyInput | FileChunkCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FileChunk update
   */
  export type FileChunkUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * The data needed to update a FileChunk.
     */
    data: XOR<FileChunkUpdateInput, FileChunkUncheckedUpdateInput>
    /**
     * Choose, which FileChunk to update.
     */
    where: FileChunkWhereUniqueInput
  }

  /**
   * FileChunk updateMany
   */
  export type FileChunkUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FileChunks.
     */
    data: XOR<FileChunkUpdateManyMutationInput, FileChunkUncheckedUpdateManyInput>
    /**
     * Filter which FileChunks to update
     */
    where?: FileChunkWhereInput
  }

  /**
   * FileChunk upsert
   */
  export type FileChunkUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * The filter to search for the FileChunk to update in case it exists.
     */
    where: FileChunkWhereUniqueInput
    /**
     * In case the FileChunk found by the `where` argument doesn't exist, create a new FileChunk with this data.
     */
    create: XOR<FileChunkCreateInput, FileChunkUncheckedCreateInput>
    /**
     * In case the FileChunk was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FileChunkUpdateInput, FileChunkUncheckedUpdateInput>
  }

  /**
   * FileChunk delete
   */
  export type FileChunkDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
    /**
     * Filter which FileChunk to delete.
     */
    where: FileChunkWhereUniqueInput
  }

  /**
   * FileChunk deleteMany
   */
  export type FileChunkDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FileChunks to delete
     */
    where?: FileChunkWhereInput
  }

  /**
   * FileChunk without action
   */
  export type FileChunkDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileChunk
     */
    select?: FileChunkSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FileChunkInclude<ExtArgs> | null
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


  export const FileScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    filename: 'filename',
    mimeType: 'mimeType',
    sizeBytes: 'sizeBytes',
    storagePath: 'storagePath',
    ingestionStatus: 'ingestionStatus',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type FileScalarFieldEnum = (typeof FileScalarFieldEnum)[keyof typeof FileScalarFieldEnum]


  export const FileChunkScalarFieldEnum: {
    id: 'id',
    fileId: 'fileId',
    chunkIndex: 'chunkIndex',
    content: 'content',
    createdAt: 'createdAt'
  };

  export type FileChunkScalarFieldEnum = (typeof FileChunkScalarFieldEnum)[keyof typeof FileChunkScalarFieldEnum]


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
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'FileIngestionStatus'
   */
  export type EnumFileIngestionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FileIngestionStatus'>
    


  /**
   * Reference to a field of type 'FileIngestionStatus[]'
   */
  export type ListEnumFileIngestionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'FileIngestionStatus[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


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


  export type FileWhereInput = {
    AND?: FileWhereInput | FileWhereInput[]
    OR?: FileWhereInput[]
    NOT?: FileWhereInput | FileWhereInput[]
    id?: StringFilter<"File"> | string
    userId?: StringFilter<"File"> | string
    filename?: StringFilter<"File"> | string
    mimeType?: StringFilter<"File"> | string
    sizeBytes?: IntFilter<"File"> | number
    storagePath?: StringFilter<"File"> | string
    ingestionStatus?: EnumFileIngestionStatusFilter<"File"> | $Enums.FileIngestionStatus
    createdAt?: DateTimeFilter<"File"> | Date | string
    updatedAt?: DateTimeFilter<"File"> | Date | string
    chunks?: FileChunkListRelationFilter
  }

  export type FileOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    filename?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    storagePath?: SortOrder
    ingestionStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    chunks?: FileChunkOrderByRelationAggregateInput
  }

  export type FileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FileWhereInput | FileWhereInput[]
    OR?: FileWhereInput[]
    NOT?: FileWhereInput | FileWhereInput[]
    userId?: StringFilter<"File"> | string
    filename?: StringFilter<"File"> | string
    mimeType?: StringFilter<"File"> | string
    sizeBytes?: IntFilter<"File"> | number
    storagePath?: StringFilter<"File"> | string
    ingestionStatus?: EnumFileIngestionStatusFilter<"File"> | $Enums.FileIngestionStatus
    createdAt?: DateTimeFilter<"File"> | Date | string
    updatedAt?: DateTimeFilter<"File"> | Date | string
    chunks?: FileChunkListRelationFilter
  }, "id">

  export type FileOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    filename?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    storagePath?: SortOrder
    ingestionStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: FileCountOrderByAggregateInput
    _avg?: FileAvgOrderByAggregateInput
    _max?: FileMaxOrderByAggregateInput
    _min?: FileMinOrderByAggregateInput
    _sum?: FileSumOrderByAggregateInput
  }

  export type FileScalarWhereWithAggregatesInput = {
    AND?: FileScalarWhereWithAggregatesInput | FileScalarWhereWithAggregatesInput[]
    OR?: FileScalarWhereWithAggregatesInput[]
    NOT?: FileScalarWhereWithAggregatesInput | FileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"File"> | string
    userId?: StringWithAggregatesFilter<"File"> | string
    filename?: StringWithAggregatesFilter<"File"> | string
    mimeType?: StringWithAggregatesFilter<"File"> | string
    sizeBytes?: IntWithAggregatesFilter<"File"> | number
    storagePath?: StringWithAggregatesFilter<"File"> | string
    ingestionStatus?: EnumFileIngestionStatusWithAggregatesFilter<"File"> | $Enums.FileIngestionStatus
    createdAt?: DateTimeWithAggregatesFilter<"File"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"File"> | Date | string
  }

  export type FileChunkWhereInput = {
    AND?: FileChunkWhereInput | FileChunkWhereInput[]
    OR?: FileChunkWhereInput[]
    NOT?: FileChunkWhereInput | FileChunkWhereInput[]
    id?: StringFilter<"FileChunk"> | string
    fileId?: StringFilter<"FileChunk"> | string
    chunkIndex?: IntFilter<"FileChunk"> | number
    content?: StringFilter<"FileChunk"> | string
    createdAt?: DateTimeFilter<"FileChunk"> | Date | string
    file?: XOR<FileRelationFilter, FileWhereInput>
  }

  export type FileChunkOrderByWithRelationInput = {
    id?: SortOrder
    fileId?: SortOrder
    chunkIndex?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    file?: FileOrderByWithRelationInput
  }

  export type FileChunkWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FileChunkWhereInput | FileChunkWhereInput[]
    OR?: FileChunkWhereInput[]
    NOT?: FileChunkWhereInput | FileChunkWhereInput[]
    fileId?: StringFilter<"FileChunk"> | string
    chunkIndex?: IntFilter<"FileChunk"> | number
    content?: StringFilter<"FileChunk"> | string
    createdAt?: DateTimeFilter<"FileChunk"> | Date | string
    file?: XOR<FileRelationFilter, FileWhereInput>
  }, "id">

  export type FileChunkOrderByWithAggregationInput = {
    id?: SortOrder
    fileId?: SortOrder
    chunkIndex?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    _count?: FileChunkCountOrderByAggregateInput
    _avg?: FileChunkAvgOrderByAggregateInput
    _max?: FileChunkMaxOrderByAggregateInput
    _min?: FileChunkMinOrderByAggregateInput
    _sum?: FileChunkSumOrderByAggregateInput
  }

  export type FileChunkScalarWhereWithAggregatesInput = {
    AND?: FileChunkScalarWhereWithAggregatesInput | FileChunkScalarWhereWithAggregatesInput[]
    OR?: FileChunkScalarWhereWithAggregatesInput[]
    NOT?: FileChunkScalarWhereWithAggregatesInput | FileChunkScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"FileChunk"> | string
    fileId?: StringWithAggregatesFilter<"FileChunk"> | string
    chunkIndex?: IntWithAggregatesFilter<"FileChunk"> | number
    content?: StringWithAggregatesFilter<"FileChunk"> | string
    createdAt?: DateTimeWithAggregatesFilter<"FileChunk"> | Date | string
  }

  export type FileCreateInput = {
    id?: string
    userId: string
    filename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    ingestionStatus?: $Enums.FileIngestionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    chunks?: FileChunkCreateNestedManyWithoutFileInput
  }

  export type FileUncheckedCreateInput = {
    id?: string
    userId: string
    filename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    ingestionStatus?: $Enums.FileIngestionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
    chunks?: FileChunkUncheckedCreateNestedManyWithoutFileInput
  }

  export type FileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    storagePath?: StringFieldUpdateOperationsInput | string
    ingestionStatus?: EnumFileIngestionStatusFieldUpdateOperationsInput | $Enums.FileIngestionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chunks?: FileChunkUpdateManyWithoutFileNestedInput
  }

  export type FileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    storagePath?: StringFieldUpdateOperationsInput | string
    ingestionStatus?: EnumFileIngestionStatusFieldUpdateOperationsInput | $Enums.FileIngestionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chunks?: FileChunkUncheckedUpdateManyWithoutFileNestedInput
  }

  export type FileCreateManyInput = {
    id?: string
    userId: string
    filename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    ingestionStatus?: $Enums.FileIngestionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    storagePath?: StringFieldUpdateOperationsInput | string
    ingestionStatus?: EnumFileIngestionStatusFieldUpdateOperationsInput | $Enums.FileIngestionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    storagePath?: StringFieldUpdateOperationsInput | string
    ingestionStatus?: EnumFileIngestionStatusFieldUpdateOperationsInput | $Enums.FileIngestionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileChunkCreateInput = {
    id?: string
    chunkIndex: number
    content: string
    createdAt?: Date | string
    file: FileCreateNestedOneWithoutChunksInput
  }

  export type FileChunkUncheckedCreateInput = {
    id?: string
    fileId: string
    chunkIndex: number
    content: string
    createdAt?: Date | string
  }

  export type FileChunkUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    file?: FileUpdateOneRequiredWithoutChunksNestedInput
  }

  export type FileChunkUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileChunkCreateManyInput = {
    id?: string
    fileId: string
    chunkIndex: number
    content: string
    createdAt?: Date | string
  }

  export type FileChunkUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileChunkUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type EnumFileIngestionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FileIngestionStatus | EnumFileIngestionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileIngestionStatusFilter<$PrismaModel> | $Enums.FileIngestionStatus
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

  export type FileChunkListRelationFilter = {
    every?: FileChunkWhereInput
    some?: FileChunkWhereInput
    none?: FileChunkWhereInput
  }

  export type FileChunkOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type FileCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    filename?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    storagePath?: SortOrder
    ingestionStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FileAvgOrderByAggregateInput = {
    sizeBytes?: SortOrder
  }

  export type FileMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    filename?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    storagePath?: SortOrder
    ingestionStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FileMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    filename?: SortOrder
    mimeType?: SortOrder
    sizeBytes?: SortOrder
    storagePath?: SortOrder
    ingestionStatus?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type FileSumOrderByAggregateInput = {
    sizeBytes?: SortOrder
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

  export type EnumFileIngestionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FileIngestionStatus | EnumFileIngestionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileIngestionStatusWithAggregatesFilter<$PrismaModel> | $Enums.FileIngestionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFileIngestionStatusFilter<$PrismaModel>
    _max?: NestedEnumFileIngestionStatusFilter<$PrismaModel>
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

  export type FileRelationFilter = {
    is?: FileWhereInput
    isNot?: FileWhereInput
  }

  export type FileChunkCountOrderByAggregateInput = {
    id?: SortOrder
    fileId?: SortOrder
    chunkIndex?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type FileChunkAvgOrderByAggregateInput = {
    chunkIndex?: SortOrder
  }

  export type FileChunkMaxOrderByAggregateInput = {
    id?: SortOrder
    fileId?: SortOrder
    chunkIndex?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type FileChunkMinOrderByAggregateInput = {
    id?: SortOrder
    fileId?: SortOrder
    chunkIndex?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type FileChunkSumOrderByAggregateInput = {
    chunkIndex?: SortOrder
  }

  export type FileChunkCreateNestedManyWithoutFileInput = {
    create?: XOR<FileChunkCreateWithoutFileInput, FileChunkUncheckedCreateWithoutFileInput> | FileChunkCreateWithoutFileInput[] | FileChunkUncheckedCreateWithoutFileInput[]
    connectOrCreate?: FileChunkCreateOrConnectWithoutFileInput | FileChunkCreateOrConnectWithoutFileInput[]
    createMany?: FileChunkCreateManyFileInputEnvelope
    connect?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
  }

  export type FileChunkUncheckedCreateNestedManyWithoutFileInput = {
    create?: XOR<FileChunkCreateWithoutFileInput, FileChunkUncheckedCreateWithoutFileInput> | FileChunkCreateWithoutFileInput[] | FileChunkUncheckedCreateWithoutFileInput[]
    connectOrCreate?: FileChunkCreateOrConnectWithoutFileInput | FileChunkCreateOrConnectWithoutFileInput[]
    createMany?: FileChunkCreateManyFileInputEnvelope
    connect?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumFileIngestionStatusFieldUpdateOperationsInput = {
    set?: $Enums.FileIngestionStatus
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type FileChunkUpdateManyWithoutFileNestedInput = {
    create?: XOR<FileChunkCreateWithoutFileInput, FileChunkUncheckedCreateWithoutFileInput> | FileChunkCreateWithoutFileInput[] | FileChunkUncheckedCreateWithoutFileInput[]
    connectOrCreate?: FileChunkCreateOrConnectWithoutFileInput | FileChunkCreateOrConnectWithoutFileInput[]
    upsert?: FileChunkUpsertWithWhereUniqueWithoutFileInput | FileChunkUpsertWithWhereUniqueWithoutFileInput[]
    createMany?: FileChunkCreateManyFileInputEnvelope
    set?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    disconnect?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    delete?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    connect?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    update?: FileChunkUpdateWithWhereUniqueWithoutFileInput | FileChunkUpdateWithWhereUniqueWithoutFileInput[]
    updateMany?: FileChunkUpdateManyWithWhereWithoutFileInput | FileChunkUpdateManyWithWhereWithoutFileInput[]
    deleteMany?: FileChunkScalarWhereInput | FileChunkScalarWhereInput[]
  }

  export type FileChunkUncheckedUpdateManyWithoutFileNestedInput = {
    create?: XOR<FileChunkCreateWithoutFileInput, FileChunkUncheckedCreateWithoutFileInput> | FileChunkCreateWithoutFileInput[] | FileChunkUncheckedCreateWithoutFileInput[]
    connectOrCreate?: FileChunkCreateOrConnectWithoutFileInput | FileChunkCreateOrConnectWithoutFileInput[]
    upsert?: FileChunkUpsertWithWhereUniqueWithoutFileInput | FileChunkUpsertWithWhereUniqueWithoutFileInput[]
    createMany?: FileChunkCreateManyFileInputEnvelope
    set?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    disconnect?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    delete?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    connect?: FileChunkWhereUniqueInput | FileChunkWhereUniqueInput[]
    update?: FileChunkUpdateWithWhereUniqueWithoutFileInput | FileChunkUpdateWithWhereUniqueWithoutFileInput[]
    updateMany?: FileChunkUpdateManyWithWhereWithoutFileInput | FileChunkUpdateManyWithWhereWithoutFileInput[]
    deleteMany?: FileChunkScalarWhereInput | FileChunkScalarWhereInput[]
  }

  export type FileCreateNestedOneWithoutChunksInput = {
    create?: XOR<FileCreateWithoutChunksInput, FileUncheckedCreateWithoutChunksInput>
    connectOrCreate?: FileCreateOrConnectWithoutChunksInput
    connect?: FileWhereUniqueInput
  }

  export type FileUpdateOneRequiredWithoutChunksNestedInput = {
    create?: XOR<FileCreateWithoutChunksInput, FileUncheckedCreateWithoutChunksInput>
    connectOrCreate?: FileCreateOrConnectWithoutChunksInput
    upsert?: FileUpsertWithoutChunksInput
    connect?: FileWhereUniqueInput
    update?: XOR<XOR<FileUpdateToOneWithWhereWithoutChunksInput, FileUpdateWithoutChunksInput>, FileUncheckedUpdateWithoutChunksInput>
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

  export type NestedEnumFileIngestionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.FileIngestionStatus | EnumFileIngestionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileIngestionStatusFilter<$PrismaModel> | $Enums.FileIngestionStatus
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

  export type NestedEnumFileIngestionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.FileIngestionStatus | EnumFileIngestionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.FileIngestionStatus[] | ListEnumFileIngestionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumFileIngestionStatusWithAggregatesFilter<$PrismaModel> | $Enums.FileIngestionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumFileIngestionStatusFilter<$PrismaModel>
    _max?: NestedEnumFileIngestionStatusFilter<$PrismaModel>
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

  export type FileChunkCreateWithoutFileInput = {
    id?: string
    chunkIndex: number
    content: string
    createdAt?: Date | string
  }

  export type FileChunkUncheckedCreateWithoutFileInput = {
    id?: string
    chunkIndex: number
    content: string
    createdAt?: Date | string
  }

  export type FileChunkCreateOrConnectWithoutFileInput = {
    where: FileChunkWhereUniqueInput
    create: XOR<FileChunkCreateWithoutFileInput, FileChunkUncheckedCreateWithoutFileInput>
  }

  export type FileChunkCreateManyFileInputEnvelope = {
    data: FileChunkCreateManyFileInput | FileChunkCreateManyFileInput[]
    skipDuplicates?: boolean
  }

  export type FileChunkUpsertWithWhereUniqueWithoutFileInput = {
    where: FileChunkWhereUniqueInput
    update: XOR<FileChunkUpdateWithoutFileInput, FileChunkUncheckedUpdateWithoutFileInput>
    create: XOR<FileChunkCreateWithoutFileInput, FileChunkUncheckedCreateWithoutFileInput>
  }

  export type FileChunkUpdateWithWhereUniqueWithoutFileInput = {
    where: FileChunkWhereUniqueInput
    data: XOR<FileChunkUpdateWithoutFileInput, FileChunkUncheckedUpdateWithoutFileInput>
  }

  export type FileChunkUpdateManyWithWhereWithoutFileInput = {
    where: FileChunkScalarWhereInput
    data: XOR<FileChunkUpdateManyMutationInput, FileChunkUncheckedUpdateManyWithoutFileInput>
  }

  export type FileChunkScalarWhereInput = {
    AND?: FileChunkScalarWhereInput | FileChunkScalarWhereInput[]
    OR?: FileChunkScalarWhereInput[]
    NOT?: FileChunkScalarWhereInput | FileChunkScalarWhereInput[]
    id?: StringFilter<"FileChunk"> | string
    fileId?: StringFilter<"FileChunk"> | string
    chunkIndex?: IntFilter<"FileChunk"> | number
    content?: StringFilter<"FileChunk"> | string
    createdAt?: DateTimeFilter<"FileChunk"> | Date | string
  }

  export type FileCreateWithoutChunksInput = {
    id?: string
    userId: string
    filename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    ingestionStatus?: $Enums.FileIngestionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FileUncheckedCreateWithoutChunksInput = {
    id?: string
    userId: string
    filename: string
    mimeType: string
    sizeBytes: number
    storagePath: string
    ingestionStatus?: $Enums.FileIngestionStatus
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type FileCreateOrConnectWithoutChunksInput = {
    where: FileWhereUniqueInput
    create: XOR<FileCreateWithoutChunksInput, FileUncheckedCreateWithoutChunksInput>
  }

  export type FileUpsertWithoutChunksInput = {
    update: XOR<FileUpdateWithoutChunksInput, FileUncheckedUpdateWithoutChunksInput>
    create: XOR<FileCreateWithoutChunksInput, FileUncheckedCreateWithoutChunksInput>
    where?: FileWhereInput
  }

  export type FileUpdateToOneWithWhereWithoutChunksInput = {
    where?: FileWhereInput
    data: XOR<FileUpdateWithoutChunksInput, FileUncheckedUpdateWithoutChunksInput>
  }

  export type FileUpdateWithoutChunksInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    storagePath?: StringFieldUpdateOperationsInput | string
    ingestionStatus?: EnumFileIngestionStatusFieldUpdateOperationsInput | $Enums.FileIngestionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileUncheckedUpdateWithoutChunksInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    filename?: StringFieldUpdateOperationsInput | string
    mimeType?: StringFieldUpdateOperationsInput | string
    sizeBytes?: IntFieldUpdateOperationsInput | number
    storagePath?: StringFieldUpdateOperationsInput | string
    ingestionStatus?: EnumFileIngestionStatusFieldUpdateOperationsInput | $Enums.FileIngestionStatus
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileChunkCreateManyFileInput = {
    id?: string
    chunkIndex: number
    content: string
    createdAt?: Date | string
  }

  export type FileChunkUpdateWithoutFileInput = {
    id?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileChunkUncheckedUpdateWithoutFileInput = {
    id?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FileChunkUncheckedUpdateManyWithoutFileInput = {
    id?: StringFieldUpdateOperationsInput | string
    chunkIndex?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use FileCountOutputTypeDefaultArgs instead
     */
    export type FileCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = FileCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use FileDefaultArgs instead
     */
    export type FileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = FileDefaultArgs<ExtArgs>
    /**
     * @deprecated Use FileChunkDefaultArgs instead
     */
    export type FileChunkArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = FileChunkDefaultArgs<ExtArgs>

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