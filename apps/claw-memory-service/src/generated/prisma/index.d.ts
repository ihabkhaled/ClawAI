
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
 * Model MemoryRecord
 * 
 */
export type MemoryRecord = $Result.DefaultSelection<Prisma.$MemoryRecordPayload>
/**
 * Model ContextPack
 * 
 */
export type ContextPack = $Result.DefaultSelection<Prisma.$ContextPackPayload>
/**
 * Model ContextPackItem
 * 
 */
export type ContextPackItem = $Result.DefaultSelection<Prisma.$ContextPackItemPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const MemoryType: {
  SUMMARY: 'SUMMARY',
  FACT: 'FACT',
  PREFERENCE: 'PREFERENCE',
  INSTRUCTION: 'INSTRUCTION'
};

export type MemoryType = (typeof MemoryType)[keyof typeof MemoryType]

}

export type MemoryType = $Enums.MemoryType

export const MemoryType: typeof $Enums.MemoryType

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more MemoryRecords
 * const memoryRecords = await prisma.memoryRecord.findMany()
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
   * // Fetch zero or more MemoryRecords
   * const memoryRecords = await prisma.memoryRecord.findMany()
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
   * `prisma.memoryRecord`: Exposes CRUD operations for the **MemoryRecord** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MemoryRecords
    * const memoryRecords = await prisma.memoryRecord.findMany()
    * ```
    */
  get memoryRecord(): Prisma.MemoryRecordDelegate<ExtArgs>;

  /**
   * `prisma.contextPack`: Exposes CRUD operations for the **ContextPack** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ContextPacks
    * const contextPacks = await prisma.contextPack.findMany()
    * ```
    */
  get contextPack(): Prisma.ContextPackDelegate<ExtArgs>;

  /**
   * `prisma.contextPackItem`: Exposes CRUD operations for the **ContextPackItem** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ContextPackItems
    * const contextPackItems = await prisma.contextPackItem.findMany()
    * ```
    */
  get contextPackItem(): Prisma.ContextPackItemDelegate<ExtArgs>;
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
    MemoryRecord: 'MemoryRecord',
    ContextPack: 'ContextPack',
    ContextPackItem: 'ContextPackItem'
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
      modelProps: "memoryRecord" | "contextPack" | "contextPackItem"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      MemoryRecord: {
        payload: Prisma.$MemoryRecordPayload<ExtArgs>
        fields: Prisma.MemoryRecordFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MemoryRecordFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MemoryRecordFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>
          }
          findFirst: {
            args: Prisma.MemoryRecordFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MemoryRecordFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>
          }
          findMany: {
            args: Prisma.MemoryRecordFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>[]
          }
          create: {
            args: Prisma.MemoryRecordCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>
          }
          createMany: {
            args: Prisma.MemoryRecordCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MemoryRecordCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>[]
          }
          delete: {
            args: Prisma.MemoryRecordDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>
          }
          update: {
            args: Prisma.MemoryRecordUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>
          }
          deleteMany: {
            args: Prisma.MemoryRecordDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MemoryRecordUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MemoryRecordUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MemoryRecordPayload>
          }
          aggregate: {
            args: Prisma.MemoryRecordAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMemoryRecord>
          }
          groupBy: {
            args: Prisma.MemoryRecordGroupByArgs<ExtArgs>
            result: $Utils.Optional<MemoryRecordGroupByOutputType>[]
          }
          count: {
            args: Prisma.MemoryRecordCountArgs<ExtArgs>
            result: $Utils.Optional<MemoryRecordCountAggregateOutputType> | number
          }
        }
      }
      ContextPack: {
        payload: Prisma.$ContextPackPayload<ExtArgs>
        fields: Prisma.ContextPackFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ContextPackFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ContextPackFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>
          }
          findFirst: {
            args: Prisma.ContextPackFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ContextPackFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>
          }
          findMany: {
            args: Prisma.ContextPackFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>[]
          }
          create: {
            args: Prisma.ContextPackCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>
          }
          createMany: {
            args: Prisma.ContextPackCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ContextPackCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>[]
          }
          delete: {
            args: Prisma.ContextPackDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>
          }
          update: {
            args: Prisma.ContextPackUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>
          }
          deleteMany: {
            args: Prisma.ContextPackDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ContextPackUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ContextPackUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackPayload>
          }
          aggregate: {
            args: Prisma.ContextPackAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateContextPack>
          }
          groupBy: {
            args: Prisma.ContextPackGroupByArgs<ExtArgs>
            result: $Utils.Optional<ContextPackGroupByOutputType>[]
          }
          count: {
            args: Prisma.ContextPackCountArgs<ExtArgs>
            result: $Utils.Optional<ContextPackCountAggregateOutputType> | number
          }
        }
      }
      ContextPackItem: {
        payload: Prisma.$ContextPackItemPayload<ExtArgs>
        fields: Prisma.ContextPackItemFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ContextPackItemFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ContextPackItemFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>
          }
          findFirst: {
            args: Prisma.ContextPackItemFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ContextPackItemFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>
          }
          findMany: {
            args: Prisma.ContextPackItemFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>[]
          }
          create: {
            args: Prisma.ContextPackItemCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>
          }
          createMany: {
            args: Prisma.ContextPackItemCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ContextPackItemCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>[]
          }
          delete: {
            args: Prisma.ContextPackItemDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>
          }
          update: {
            args: Prisma.ContextPackItemUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>
          }
          deleteMany: {
            args: Prisma.ContextPackItemDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ContextPackItemUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ContextPackItemUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ContextPackItemPayload>
          }
          aggregate: {
            args: Prisma.ContextPackItemAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateContextPackItem>
          }
          groupBy: {
            args: Prisma.ContextPackItemGroupByArgs<ExtArgs>
            result: $Utils.Optional<ContextPackItemGroupByOutputType>[]
          }
          count: {
            args: Prisma.ContextPackItemCountArgs<ExtArgs>
            result: $Utils.Optional<ContextPackItemCountAggregateOutputType> | number
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
   * Count Type ContextPackCountOutputType
   */

  export type ContextPackCountOutputType = {
    items: number
  }

  export type ContextPackCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | ContextPackCountOutputTypeCountItemsArgs
  }

  // Custom InputTypes
  /**
   * ContextPackCountOutputType without action
   */
  export type ContextPackCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackCountOutputType
     */
    select?: ContextPackCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ContextPackCountOutputType without action
   */
  export type ContextPackCountOutputTypeCountItemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContextPackItemWhereInput
  }


  /**
   * Models
   */

  /**
   * Model MemoryRecord
   */

  export type AggregateMemoryRecord = {
    _count: MemoryRecordCountAggregateOutputType | null
    _min: MemoryRecordMinAggregateOutputType | null
    _max: MemoryRecordMaxAggregateOutputType | null
  }

  export type MemoryRecordMinAggregateOutputType = {
    id: string | null
    userId: string | null
    type: $Enums.MemoryType | null
    content: string | null
    sourceThreadId: string | null
    sourceMessageId: string | null
    isEnabled: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MemoryRecordMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    type: $Enums.MemoryType | null
    content: string | null
    sourceThreadId: string | null
    sourceMessageId: string | null
    isEnabled: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type MemoryRecordCountAggregateOutputType = {
    id: number
    userId: number
    type: number
    content: number
    sourceThreadId: number
    sourceMessageId: number
    isEnabled: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type MemoryRecordMinAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    content?: true
    sourceThreadId?: true
    sourceMessageId?: true
    isEnabled?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MemoryRecordMaxAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    content?: true
    sourceThreadId?: true
    sourceMessageId?: true
    isEnabled?: true
    createdAt?: true
    updatedAt?: true
  }

  export type MemoryRecordCountAggregateInputType = {
    id?: true
    userId?: true
    type?: true
    content?: true
    sourceThreadId?: true
    sourceMessageId?: true
    isEnabled?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type MemoryRecordAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MemoryRecord to aggregate.
     */
    where?: MemoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MemoryRecords to fetch.
     */
    orderBy?: MemoryRecordOrderByWithRelationInput | MemoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MemoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MemoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MemoryRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MemoryRecords
    **/
    _count?: true | MemoryRecordCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MemoryRecordMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MemoryRecordMaxAggregateInputType
  }

  export type GetMemoryRecordAggregateType<T extends MemoryRecordAggregateArgs> = {
        [P in keyof T & keyof AggregateMemoryRecord]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMemoryRecord[P]>
      : GetScalarType<T[P], AggregateMemoryRecord[P]>
  }




  export type MemoryRecordGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MemoryRecordWhereInput
    orderBy?: MemoryRecordOrderByWithAggregationInput | MemoryRecordOrderByWithAggregationInput[]
    by: MemoryRecordScalarFieldEnum[] | MemoryRecordScalarFieldEnum
    having?: MemoryRecordScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MemoryRecordCountAggregateInputType | true
    _min?: MemoryRecordMinAggregateInputType
    _max?: MemoryRecordMaxAggregateInputType
  }

  export type MemoryRecordGroupByOutputType = {
    id: string
    userId: string
    type: $Enums.MemoryType
    content: string
    sourceThreadId: string | null
    sourceMessageId: string | null
    isEnabled: boolean
    createdAt: Date
    updatedAt: Date
    _count: MemoryRecordCountAggregateOutputType | null
    _min: MemoryRecordMinAggregateOutputType | null
    _max: MemoryRecordMaxAggregateOutputType | null
  }

  type GetMemoryRecordGroupByPayload<T extends MemoryRecordGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MemoryRecordGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MemoryRecordGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MemoryRecordGroupByOutputType[P]>
            : GetScalarType<T[P], MemoryRecordGroupByOutputType[P]>
        }
      >
    >


  export type MemoryRecordSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    content?: boolean
    sourceThreadId?: boolean
    sourceMessageId?: boolean
    isEnabled?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["memoryRecord"]>

  export type MemoryRecordSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    type?: boolean
    content?: boolean
    sourceThreadId?: boolean
    sourceMessageId?: boolean
    isEnabled?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["memoryRecord"]>

  export type MemoryRecordSelectScalar = {
    id?: boolean
    userId?: boolean
    type?: boolean
    content?: boolean
    sourceThreadId?: boolean
    sourceMessageId?: boolean
    isEnabled?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $MemoryRecordPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MemoryRecord"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      type: $Enums.MemoryType
      content: string
      sourceThreadId: string | null
      sourceMessageId: string | null
      isEnabled: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["memoryRecord"]>
    composites: {}
  }

  type MemoryRecordGetPayload<S extends boolean | null | undefined | MemoryRecordDefaultArgs> = $Result.GetResult<Prisma.$MemoryRecordPayload, S>

  type MemoryRecordCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MemoryRecordFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MemoryRecordCountAggregateInputType | true
    }

  export interface MemoryRecordDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MemoryRecord'], meta: { name: 'MemoryRecord' } }
    /**
     * Find zero or one MemoryRecord that matches the filter.
     * @param {MemoryRecordFindUniqueArgs} args - Arguments to find a MemoryRecord
     * @example
     * // Get one MemoryRecord
     * const memoryRecord = await prisma.memoryRecord.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MemoryRecordFindUniqueArgs>(args: SelectSubset<T, MemoryRecordFindUniqueArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one MemoryRecord that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {MemoryRecordFindUniqueOrThrowArgs} args - Arguments to find a MemoryRecord
     * @example
     * // Get one MemoryRecord
     * const memoryRecord = await prisma.memoryRecord.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MemoryRecordFindUniqueOrThrowArgs>(args: SelectSubset<T, MemoryRecordFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first MemoryRecord that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordFindFirstArgs} args - Arguments to find a MemoryRecord
     * @example
     * // Get one MemoryRecord
     * const memoryRecord = await prisma.memoryRecord.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MemoryRecordFindFirstArgs>(args?: SelectSubset<T, MemoryRecordFindFirstArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first MemoryRecord that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordFindFirstOrThrowArgs} args - Arguments to find a MemoryRecord
     * @example
     * // Get one MemoryRecord
     * const memoryRecord = await prisma.memoryRecord.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MemoryRecordFindFirstOrThrowArgs>(args?: SelectSubset<T, MemoryRecordFindFirstOrThrowArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more MemoryRecords that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MemoryRecords
     * const memoryRecords = await prisma.memoryRecord.findMany()
     * 
     * // Get first 10 MemoryRecords
     * const memoryRecords = await prisma.memoryRecord.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const memoryRecordWithIdOnly = await prisma.memoryRecord.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MemoryRecordFindManyArgs>(args?: SelectSubset<T, MemoryRecordFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a MemoryRecord.
     * @param {MemoryRecordCreateArgs} args - Arguments to create a MemoryRecord.
     * @example
     * // Create one MemoryRecord
     * const MemoryRecord = await prisma.memoryRecord.create({
     *   data: {
     *     // ... data to create a MemoryRecord
     *   }
     * })
     * 
     */
    create<T extends MemoryRecordCreateArgs>(args: SelectSubset<T, MemoryRecordCreateArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many MemoryRecords.
     * @param {MemoryRecordCreateManyArgs} args - Arguments to create many MemoryRecords.
     * @example
     * // Create many MemoryRecords
     * const memoryRecord = await prisma.memoryRecord.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MemoryRecordCreateManyArgs>(args?: SelectSubset<T, MemoryRecordCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MemoryRecords and returns the data saved in the database.
     * @param {MemoryRecordCreateManyAndReturnArgs} args - Arguments to create many MemoryRecords.
     * @example
     * // Create many MemoryRecords
     * const memoryRecord = await prisma.memoryRecord.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MemoryRecords and only return the `id`
     * const memoryRecordWithIdOnly = await prisma.memoryRecord.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MemoryRecordCreateManyAndReturnArgs>(args?: SelectSubset<T, MemoryRecordCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a MemoryRecord.
     * @param {MemoryRecordDeleteArgs} args - Arguments to delete one MemoryRecord.
     * @example
     * // Delete one MemoryRecord
     * const MemoryRecord = await prisma.memoryRecord.delete({
     *   where: {
     *     // ... filter to delete one MemoryRecord
     *   }
     * })
     * 
     */
    delete<T extends MemoryRecordDeleteArgs>(args: SelectSubset<T, MemoryRecordDeleteArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one MemoryRecord.
     * @param {MemoryRecordUpdateArgs} args - Arguments to update one MemoryRecord.
     * @example
     * // Update one MemoryRecord
     * const memoryRecord = await prisma.memoryRecord.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MemoryRecordUpdateArgs>(args: SelectSubset<T, MemoryRecordUpdateArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more MemoryRecords.
     * @param {MemoryRecordDeleteManyArgs} args - Arguments to filter MemoryRecords to delete.
     * @example
     * // Delete a few MemoryRecords
     * const { count } = await prisma.memoryRecord.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MemoryRecordDeleteManyArgs>(args?: SelectSubset<T, MemoryRecordDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MemoryRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MemoryRecords
     * const memoryRecord = await prisma.memoryRecord.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MemoryRecordUpdateManyArgs>(args: SelectSubset<T, MemoryRecordUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MemoryRecord.
     * @param {MemoryRecordUpsertArgs} args - Arguments to update or create a MemoryRecord.
     * @example
     * // Update or create a MemoryRecord
     * const memoryRecord = await prisma.memoryRecord.upsert({
     *   create: {
     *     // ... data to create a MemoryRecord
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MemoryRecord we want to update
     *   }
     * })
     */
    upsert<T extends MemoryRecordUpsertArgs>(args: SelectSubset<T, MemoryRecordUpsertArgs<ExtArgs>>): Prisma__MemoryRecordClient<$Result.GetResult<Prisma.$MemoryRecordPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of MemoryRecords.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordCountArgs} args - Arguments to filter MemoryRecords to count.
     * @example
     * // Count the number of MemoryRecords
     * const count = await prisma.memoryRecord.count({
     *   where: {
     *     // ... the filter for the MemoryRecords we want to count
     *   }
     * })
    **/
    count<T extends MemoryRecordCountArgs>(
      args?: Subset<T, MemoryRecordCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MemoryRecordCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MemoryRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends MemoryRecordAggregateArgs>(args: Subset<T, MemoryRecordAggregateArgs>): Prisma.PrismaPromise<GetMemoryRecordAggregateType<T>>

    /**
     * Group by MemoryRecord.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MemoryRecordGroupByArgs} args - Group by arguments.
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
      T extends MemoryRecordGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MemoryRecordGroupByArgs['orderBy'] }
        : { orderBy?: MemoryRecordGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, MemoryRecordGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMemoryRecordGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MemoryRecord model
   */
  readonly fields: MemoryRecordFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MemoryRecord.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MemoryRecordClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
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
   * Fields of the MemoryRecord model
   */ 
  interface MemoryRecordFieldRefs {
    readonly id: FieldRef<"MemoryRecord", 'String'>
    readonly userId: FieldRef<"MemoryRecord", 'String'>
    readonly type: FieldRef<"MemoryRecord", 'MemoryType'>
    readonly content: FieldRef<"MemoryRecord", 'String'>
    readonly sourceThreadId: FieldRef<"MemoryRecord", 'String'>
    readonly sourceMessageId: FieldRef<"MemoryRecord", 'String'>
    readonly isEnabled: FieldRef<"MemoryRecord", 'Boolean'>
    readonly createdAt: FieldRef<"MemoryRecord", 'DateTime'>
    readonly updatedAt: FieldRef<"MemoryRecord", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * MemoryRecord findUnique
   */
  export type MemoryRecordFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * Filter, which MemoryRecord to fetch.
     */
    where: MemoryRecordWhereUniqueInput
  }

  /**
   * MemoryRecord findUniqueOrThrow
   */
  export type MemoryRecordFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * Filter, which MemoryRecord to fetch.
     */
    where: MemoryRecordWhereUniqueInput
  }

  /**
   * MemoryRecord findFirst
   */
  export type MemoryRecordFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * Filter, which MemoryRecord to fetch.
     */
    where?: MemoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MemoryRecords to fetch.
     */
    orderBy?: MemoryRecordOrderByWithRelationInput | MemoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MemoryRecords.
     */
    cursor?: MemoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MemoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MemoryRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MemoryRecords.
     */
    distinct?: MemoryRecordScalarFieldEnum | MemoryRecordScalarFieldEnum[]
  }

  /**
   * MemoryRecord findFirstOrThrow
   */
  export type MemoryRecordFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * Filter, which MemoryRecord to fetch.
     */
    where?: MemoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MemoryRecords to fetch.
     */
    orderBy?: MemoryRecordOrderByWithRelationInput | MemoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MemoryRecords.
     */
    cursor?: MemoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MemoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MemoryRecords.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MemoryRecords.
     */
    distinct?: MemoryRecordScalarFieldEnum | MemoryRecordScalarFieldEnum[]
  }

  /**
   * MemoryRecord findMany
   */
  export type MemoryRecordFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * Filter, which MemoryRecords to fetch.
     */
    where?: MemoryRecordWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MemoryRecords to fetch.
     */
    orderBy?: MemoryRecordOrderByWithRelationInput | MemoryRecordOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MemoryRecords.
     */
    cursor?: MemoryRecordWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MemoryRecords from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MemoryRecords.
     */
    skip?: number
    distinct?: MemoryRecordScalarFieldEnum | MemoryRecordScalarFieldEnum[]
  }

  /**
   * MemoryRecord create
   */
  export type MemoryRecordCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * The data needed to create a MemoryRecord.
     */
    data: XOR<MemoryRecordCreateInput, MemoryRecordUncheckedCreateInput>
  }

  /**
   * MemoryRecord createMany
   */
  export type MemoryRecordCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MemoryRecords.
     */
    data: MemoryRecordCreateManyInput | MemoryRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MemoryRecord createManyAndReturn
   */
  export type MemoryRecordCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many MemoryRecords.
     */
    data: MemoryRecordCreateManyInput | MemoryRecordCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MemoryRecord update
   */
  export type MemoryRecordUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * The data needed to update a MemoryRecord.
     */
    data: XOR<MemoryRecordUpdateInput, MemoryRecordUncheckedUpdateInput>
    /**
     * Choose, which MemoryRecord to update.
     */
    where: MemoryRecordWhereUniqueInput
  }

  /**
   * MemoryRecord updateMany
   */
  export type MemoryRecordUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MemoryRecords.
     */
    data: XOR<MemoryRecordUpdateManyMutationInput, MemoryRecordUncheckedUpdateManyInput>
    /**
     * Filter which MemoryRecords to update
     */
    where?: MemoryRecordWhereInput
  }

  /**
   * MemoryRecord upsert
   */
  export type MemoryRecordUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * The filter to search for the MemoryRecord to update in case it exists.
     */
    where: MemoryRecordWhereUniqueInput
    /**
     * In case the MemoryRecord found by the `where` argument doesn't exist, create a new MemoryRecord with this data.
     */
    create: XOR<MemoryRecordCreateInput, MemoryRecordUncheckedCreateInput>
    /**
     * In case the MemoryRecord was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MemoryRecordUpdateInput, MemoryRecordUncheckedUpdateInput>
  }

  /**
   * MemoryRecord delete
   */
  export type MemoryRecordDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
    /**
     * Filter which MemoryRecord to delete.
     */
    where: MemoryRecordWhereUniqueInput
  }

  /**
   * MemoryRecord deleteMany
   */
  export type MemoryRecordDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MemoryRecords to delete
     */
    where?: MemoryRecordWhereInput
  }

  /**
   * MemoryRecord without action
   */
  export type MemoryRecordDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MemoryRecord
     */
    select?: MemoryRecordSelect<ExtArgs> | null
  }


  /**
   * Model ContextPack
   */

  export type AggregateContextPack = {
    _count: ContextPackCountAggregateOutputType | null
    _min: ContextPackMinAggregateOutputType | null
    _max: ContextPackMaxAggregateOutputType | null
  }

  export type ContextPackMinAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    scope: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ContextPackMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    name: string | null
    description: string | null
    scope: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ContextPackCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    description: number
    scope: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ContextPackMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    scope?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ContextPackMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    scope?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ContextPackCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    description?: true
    scope?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ContextPackAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContextPack to aggregate.
     */
    where?: ContextPackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPacks to fetch.
     */
    orderBy?: ContextPackOrderByWithRelationInput | ContextPackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ContextPackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPacks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ContextPacks
    **/
    _count?: true | ContextPackCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ContextPackMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ContextPackMaxAggregateInputType
  }

  export type GetContextPackAggregateType<T extends ContextPackAggregateArgs> = {
        [P in keyof T & keyof AggregateContextPack]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateContextPack[P]>
      : GetScalarType<T[P], AggregateContextPack[P]>
  }




  export type ContextPackGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContextPackWhereInput
    orderBy?: ContextPackOrderByWithAggregationInput | ContextPackOrderByWithAggregationInput[]
    by: ContextPackScalarFieldEnum[] | ContextPackScalarFieldEnum
    having?: ContextPackScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ContextPackCountAggregateInputType | true
    _min?: ContextPackMinAggregateInputType
    _max?: ContextPackMaxAggregateInputType
  }

  export type ContextPackGroupByOutputType = {
    id: string
    userId: string
    name: string
    description: string | null
    scope: string | null
    createdAt: Date
    updatedAt: Date
    _count: ContextPackCountAggregateOutputType | null
    _min: ContextPackMinAggregateOutputType | null
    _max: ContextPackMaxAggregateOutputType | null
  }

  type GetContextPackGroupByPayload<T extends ContextPackGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ContextPackGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ContextPackGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ContextPackGroupByOutputType[P]>
            : GetScalarType<T[P], ContextPackGroupByOutputType[P]>
        }
      >
    >


  export type ContextPackSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    scope?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    items?: boolean | ContextPack$itemsArgs<ExtArgs>
    _count?: boolean | ContextPackCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contextPack"]>

  export type ContextPackSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    scope?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["contextPack"]>

  export type ContextPackSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    description?: boolean
    scope?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ContextPackInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    items?: boolean | ContextPack$itemsArgs<ExtArgs>
    _count?: boolean | ContextPackCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ContextPackIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ContextPackPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ContextPack"
    objects: {
      items: Prisma.$ContextPackItemPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      name: string
      description: string | null
      scope: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["contextPack"]>
    composites: {}
  }

  type ContextPackGetPayload<S extends boolean | null | undefined | ContextPackDefaultArgs> = $Result.GetResult<Prisma.$ContextPackPayload, S>

  type ContextPackCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ContextPackFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ContextPackCountAggregateInputType | true
    }

  export interface ContextPackDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ContextPack'], meta: { name: 'ContextPack' } }
    /**
     * Find zero or one ContextPack that matches the filter.
     * @param {ContextPackFindUniqueArgs} args - Arguments to find a ContextPack
     * @example
     * // Get one ContextPack
     * const contextPack = await prisma.contextPack.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ContextPackFindUniqueArgs>(args: SelectSubset<T, ContextPackFindUniqueArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ContextPack that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ContextPackFindUniqueOrThrowArgs} args - Arguments to find a ContextPack
     * @example
     * // Get one ContextPack
     * const contextPack = await prisma.contextPack.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ContextPackFindUniqueOrThrowArgs>(args: SelectSubset<T, ContextPackFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ContextPack that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackFindFirstArgs} args - Arguments to find a ContextPack
     * @example
     * // Get one ContextPack
     * const contextPack = await prisma.contextPack.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ContextPackFindFirstArgs>(args?: SelectSubset<T, ContextPackFindFirstArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ContextPack that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackFindFirstOrThrowArgs} args - Arguments to find a ContextPack
     * @example
     * // Get one ContextPack
     * const contextPack = await prisma.contextPack.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ContextPackFindFirstOrThrowArgs>(args?: SelectSubset<T, ContextPackFindFirstOrThrowArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ContextPacks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ContextPacks
     * const contextPacks = await prisma.contextPack.findMany()
     * 
     * // Get first 10 ContextPacks
     * const contextPacks = await prisma.contextPack.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const contextPackWithIdOnly = await prisma.contextPack.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ContextPackFindManyArgs>(args?: SelectSubset<T, ContextPackFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ContextPack.
     * @param {ContextPackCreateArgs} args - Arguments to create a ContextPack.
     * @example
     * // Create one ContextPack
     * const ContextPack = await prisma.contextPack.create({
     *   data: {
     *     // ... data to create a ContextPack
     *   }
     * })
     * 
     */
    create<T extends ContextPackCreateArgs>(args: SelectSubset<T, ContextPackCreateArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ContextPacks.
     * @param {ContextPackCreateManyArgs} args - Arguments to create many ContextPacks.
     * @example
     * // Create many ContextPacks
     * const contextPack = await prisma.contextPack.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ContextPackCreateManyArgs>(args?: SelectSubset<T, ContextPackCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ContextPacks and returns the data saved in the database.
     * @param {ContextPackCreateManyAndReturnArgs} args - Arguments to create many ContextPacks.
     * @example
     * // Create many ContextPacks
     * const contextPack = await prisma.contextPack.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ContextPacks and only return the `id`
     * const contextPackWithIdOnly = await prisma.contextPack.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ContextPackCreateManyAndReturnArgs>(args?: SelectSubset<T, ContextPackCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ContextPack.
     * @param {ContextPackDeleteArgs} args - Arguments to delete one ContextPack.
     * @example
     * // Delete one ContextPack
     * const ContextPack = await prisma.contextPack.delete({
     *   where: {
     *     // ... filter to delete one ContextPack
     *   }
     * })
     * 
     */
    delete<T extends ContextPackDeleteArgs>(args: SelectSubset<T, ContextPackDeleteArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ContextPack.
     * @param {ContextPackUpdateArgs} args - Arguments to update one ContextPack.
     * @example
     * // Update one ContextPack
     * const contextPack = await prisma.contextPack.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ContextPackUpdateArgs>(args: SelectSubset<T, ContextPackUpdateArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ContextPacks.
     * @param {ContextPackDeleteManyArgs} args - Arguments to filter ContextPacks to delete.
     * @example
     * // Delete a few ContextPacks
     * const { count } = await prisma.contextPack.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ContextPackDeleteManyArgs>(args?: SelectSubset<T, ContextPackDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ContextPacks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ContextPacks
     * const contextPack = await prisma.contextPack.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ContextPackUpdateManyArgs>(args: SelectSubset<T, ContextPackUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ContextPack.
     * @param {ContextPackUpsertArgs} args - Arguments to update or create a ContextPack.
     * @example
     * // Update or create a ContextPack
     * const contextPack = await prisma.contextPack.upsert({
     *   create: {
     *     // ... data to create a ContextPack
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ContextPack we want to update
     *   }
     * })
     */
    upsert<T extends ContextPackUpsertArgs>(args: SelectSubset<T, ContextPackUpsertArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ContextPacks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackCountArgs} args - Arguments to filter ContextPacks to count.
     * @example
     * // Count the number of ContextPacks
     * const count = await prisma.contextPack.count({
     *   where: {
     *     // ... the filter for the ContextPacks we want to count
     *   }
     * })
    **/
    count<T extends ContextPackCountArgs>(
      args?: Subset<T, ContextPackCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ContextPackCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ContextPack.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ContextPackAggregateArgs>(args: Subset<T, ContextPackAggregateArgs>): Prisma.PrismaPromise<GetContextPackAggregateType<T>>

    /**
     * Group by ContextPack.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackGroupByArgs} args - Group by arguments.
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
      T extends ContextPackGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ContextPackGroupByArgs['orderBy'] }
        : { orderBy?: ContextPackGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ContextPackGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetContextPackGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ContextPack model
   */
  readonly fields: ContextPackFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ContextPack.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ContextPackClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    items<T extends ContextPack$itemsArgs<ExtArgs> = {}>(args?: Subset<T, ContextPack$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the ContextPack model
   */ 
  interface ContextPackFieldRefs {
    readonly id: FieldRef<"ContextPack", 'String'>
    readonly userId: FieldRef<"ContextPack", 'String'>
    readonly name: FieldRef<"ContextPack", 'String'>
    readonly description: FieldRef<"ContextPack", 'String'>
    readonly scope: FieldRef<"ContextPack", 'String'>
    readonly createdAt: FieldRef<"ContextPack", 'DateTime'>
    readonly updatedAt: FieldRef<"ContextPack", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ContextPack findUnique
   */
  export type ContextPackFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * Filter, which ContextPack to fetch.
     */
    where: ContextPackWhereUniqueInput
  }

  /**
   * ContextPack findUniqueOrThrow
   */
  export type ContextPackFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * Filter, which ContextPack to fetch.
     */
    where: ContextPackWhereUniqueInput
  }

  /**
   * ContextPack findFirst
   */
  export type ContextPackFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * Filter, which ContextPack to fetch.
     */
    where?: ContextPackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPacks to fetch.
     */
    orderBy?: ContextPackOrderByWithRelationInput | ContextPackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContextPacks.
     */
    cursor?: ContextPackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPacks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContextPacks.
     */
    distinct?: ContextPackScalarFieldEnum | ContextPackScalarFieldEnum[]
  }

  /**
   * ContextPack findFirstOrThrow
   */
  export type ContextPackFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * Filter, which ContextPack to fetch.
     */
    where?: ContextPackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPacks to fetch.
     */
    orderBy?: ContextPackOrderByWithRelationInput | ContextPackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContextPacks.
     */
    cursor?: ContextPackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPacks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContextPacks.
     */
    distinct?: ContextPackScalarFieldEnum | ContextPackScalarFieldEnum[]
  }

  /**
   * ContextPack findMany
   */
  export type ContextPackFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * Filter, which ContextPacks to fetch.
     */
    where?: ContextPackWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPacks to fetch.
     */
    orderBy?: ContextPackOrderByWithRelationInput | ContextPackOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ContextPacks.
     */
    cursor?: ContextPackWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPacks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPacks.
     */
    skip?: number
    distinct?: ContextPackScalarFieldEnum | ContextPackScalarFieldEnum[]
  }

  /**
   * ContextPack create
   */
  export type ContextPackCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * The data needed to create a ContextPack.
     */
    data: XOR<ContextPackCreateInput, ContextPackUncheckedCreateInput>
  }

  /**
   * ContextPack createMany
   */
  export type ContextPackCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ContextPacks.
     */
    data: ContextPackCreateManyInput | ContextPackCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ContextPack createManyAndReturn
   */
  export type ContextPackCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ContextPacks.
     */
    data: ContextPackCreateManyInput | ContextPackCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ContextPack update
   */
  export type ContextPackUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * The data needed to update a ContextPack.
     */
    data: XOR<ContextPackUpdateInput, ContextPackUncheckedUpdateInput>
    /**
     * Choose, which ContextPack to update.
     */
    where: ContextPackWhereUniqueInput
  }

  /**
   * ContextPack updateMany
   */
  export type ContextPackUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ContextPacks.
     */
    data: XOR<ContextPackUpdateManyMutationInput, ContextPackUncheckedUpdateManyInput>
    /**
     * Filter which ContextPacks to update
     */
    where?: ContextPackWhereInput
  }

  /**
   * ContextPack upsert
   */
  export type ContextPackUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * The filter to search for the ContextPack to update in case it exists.
     */
    where: ContextPackWhereUniqueInput
    /**
     * In case the ContextPack found by the `where` argument doesn't exist, create a new ContextPack with this data.
     */
    create: XOR<ContextPackCreateInput, ContextPackUncheckedCreateInput>
    /**
     * In case the ContextPack was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ContextPackUpdateInput, ContextPackUncheckedUpdateInput>
  }

  /**
   * ContextPack delete
   */
  export type ContextPackDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
    /**
     * Filter which ContextPack to delete.
     */
    where: ContextPackWhereUniqueInput
  }

  /**
   * ContextPack deleteMany
   */
  export type ContextPackDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContextPacks to delete
     */
    where?: ContextPackWhereInput
  }

  /**
   * ContextPack.items
   */
  export type ContextPack$itemsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    where?: ContextPackItemWhereInput
    orderBy?: ContextPackItemOrderByWithRelationInput | ContextPackItemOrderByWithRelationInput[]
    cursor?: ContextPackItemWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ContextPackItemScalarFieldEnum | ContextPackItemScalarFieldEnum[]
  }

  /**
   * ContextPack without action
   */
  export type ContextPackDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPack
     */
    select?: ContextPackSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackInclude<ExtArgs> | null
  }


  /**
   * Model ContextPackItem
   */

  export type AggregateContextPackItem = {
    _count: ContextPackItemCountAggregateOutputType | null
    _avg: ContextPackItemAvgAggregateOutputType | null
    _sum: ContextPackItemSumAggregateOutputType | null
    _min: ContextPackItemMinAggregateOutputType | null
    _max: ContextPackItemMaxAggregateOutputType | null
  }

  export type ContextPackItemAvgAggregateOutputType = {
    sortOrder: number | null
  }

  export type ContextPackItemSumAggregateOutputType = {
    sortOrder: number | null
  }

  export type ContextPackItemMinAggregateOutputType = {
    id: string | null
    contextPackId: string | null
    type: string | null
    content: string | null
    fileId: string | null
    sortOrder: number | null
    createdAt: Date | null
  }

  export type ContextPackItemMaxAggregateOutputType = {
    id: string | null
    contextPackId: string | null
    type: string | null
    content: string | null
    fileId: string | null
    sortOrder: number | null
    createdAt: Date | null
  }

  export type ContextPackItemCountAggregateOutputType = {
    id: number
    contextPackId: number
    type: number
    content: number
    fileId: number
    sortOrder: number
    createdAt: number
    _all: number
  }


  export type ContextPackItemAvgAggregateInputType = {
    sortOrder?: true
  }

  export type ContextPackItemSumAggregateInputType = {
    sortOrder?: true
  }

  export type ContextPackItemMinAggregateInputType = {
    id?: true
    contextPackId?: true
    type?: true
    content?: true
    fileId?: true
    sortOrder?: true
    createdAt?: true
  }

  export type ContextPackItemMaxAggregateInputType = {
    id?: true
    contextPackId?: true
    type?: true
    content?: true
    fileId?: true
    sortOrder?: true
    createdAt?: true
  }

  export type ContextPackItemCountAggregateInputType = {
    id?: true
    contextPackId?: true
    type?: true
    content?: true
    fileId?: true
    sortOrder?: true
    createdAt?: true
    _all?: true
  }

  export type ContextPackItemAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContextPackItem to aggregate.
     */
    where?: ContextPackItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPackItems to fetch.
     */
    orderBy?: ContextPackItemOrderByWithRelationInput | ContextPackItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ContextPackItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPackItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPackItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ContextPackItems
    **/
    _count?: true | ContextPackItemCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ContextPackItemAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ContextPackItemSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ContextPackItemMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ContextPackItemMaxAggregateInputType
  }

  export type GetContextPackItemAggregateType<T extends ContextPackItemAggregateArgs> = {
        [P in keyof T & keyof AggregateContextPackItem]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateContextPackItem[P]>
      : GetScalarType<T[P], AggregateContextPackItem[P]>
  }




  export type ContextPackItemGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ContextPackItemWhereInput
    orderBy?: ContextPackItemOrderByWithAggregationInput | ContextPackItemOrderByWithAggregationInput[]
    by: ContextPackItemScalarFieldEnum[] | ContextPackItemScalarFieldEnum
    having?: ContextPackItemScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ContextPackItemCountAggregateInputType | true
    _avg?: ContextPackItemAvgAggregateInputType
    _sum?: ContextPackItemSumAggregateInputType
    _min?: ContextPackItemMinAggregateInputType
    _max?: ContextPackItemMaxAggregateInputType
  }

  export type ContextPackItemGroupByOutputType = {
    id: string
    contextPackId: string
    type: string
    content: string | null
    fileId: string | null
    sortOrder: number
    createdAt: Date
    _count: ContextPackItemCountAggregateOutputType | null
    _avg: ContextPackItemAvgAggregateOutputType | null
    _sum: ContextPackItemSumAggregateOutputType | null
    _min: ContextPackItemMinAggregateOutputType | null
    _max: ContextPackItemMaxAggregateOutputType | null
  }

  type GetContextPackItemGroupByPayload<T extends ContextPackItemGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ContextPackItemGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ContextPackItemGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ContextPackItemGroupByOutputType[P]>
            : GetScalarType<T[P], ContextPackItemGroupByOutputType[P]>
        }
      >
    >


  export type ContextPackItemSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    contextPackId?: boolean
    type?: boolean
    content?: boolean
    fileId?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    contextPack?: boolean | ContextPackDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contextPackItem"]>

  export type ContextPackItemSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    contextPackId?: boolean
    type?: boolean
    content?: boolean
    fileId?: boolean
    sortOrder?: boolean
    createdAt?: boolean
    contextPack?: boolean | ContextPackDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["contextPackItem"]>

  export type ContextPackItemSelectScalar = {
    id?: boolean
    contextPackId?: boolean
    type?: boolean
    content?: boolean
    fileId?: boolean
    sortOrder?: boolean
    createdAt?: boolean
  }

  export type ContextPackItemInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    contextPack?: boolean | ContextPackDefaultArgs<ExtArgs>
  }
  export type ContextPackItemIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    contextPack?: boolean | ContextPackDefaultArgs<ExtArgs>
  }

  export type $ContextPackItemPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ContextPackItem"
    objects: {
      contextPack: Prisma.$ContextPackPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      contextPackId: string
      type: string
      content: string | null
      fileId: string | null
      sortOrder: number
      createdAt: Date
    }, ExtArgs["result"]["contextPackItem"]>
    composites: {}
  }

  type ContextPackItemGetPayload<S extends boolean | null | undefined | ContextPackItemDefaultArgs> = $Result.GetResult<Prisma.$ContextPackItemPayload, S>

  type ContextPackItemCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ContextPackItemFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ContextPackItemCountAggregateInputType | true
    }

  export interface ContextPackItemDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ContextPackItem'], meta: { name: 'ContextPackItem' } }
    /**
     * Find zero or one ContextPackItem that matches the filter.
     * @param {ContextPackItemFindUniqueArgs} args - Arguments to find a ContextPackItem
     * @example
     * // Get one ContextPackItem
     * const contextPackItem = await prisma.contextPackItem.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ContextPackItemFindUniqueArgs>(args: SelectSubset<T, ContextPackItemFindUniqueArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ContextPackItem that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ContextPackItemFindUniqueOrThrowArgs} args - Arguments to find a ContextPackItem
     * @example
     * // Get one ContextPackItem
     * const contextPackItem = await prisma.contextPackItem.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ContextPackItemFindUniqueOrThrowArgs>(args: SelectSubset<T, ContextPackItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ContextPackItem that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemFindFirstArgs} args - Arguments to find a ContextPackItem
     * @example
     * // Get one ContextPackItem
     * const contextPackItem = await prisma.contextPackItem.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ContextPackItemFindFirstArgs>(args?: SelectSubset<T, ContextPackItemFindFirstArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ContextPackItem that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemFindFirstOrThrowArgs} args - Arguments to find a ContextPackItem
     * @example
     * // Get one ContextPackItem
     * const contextPackItem = await prisma.contextPackItem.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ContextPackItemFindFirstOrThrowArgs>(args?: SelectSubset<T, ContextPackItemFindFirstOrThrowArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ContextPackItems that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ContextPackItems
     * const contextPackItems = await prisma.contextPackItem.findMany()
     * 
     * // Get first 10 ContextPackItems
     * const contextPackItems = await prisma.contextPackItem.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const contextPackItemWithIdOnly = await prisma.contextPackItem.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ContextPackItemFindManyArgs>(args?: SelectSubset<T, ContextPackItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ContextPackItem.
     * @param {ContextPackItemCreateArgs} args - Arguments to create a ContextPackItem.
     * @example
     * // Create one ContextPackItem
     * const ContextPackItem = await prisma.contextPackItem.create({
     *   data: {
     *     // ... data to create a ContextPackItem
     *   }
     * })
     * 
     */
    create<T extends ContextPackItemCreateArgs>(args: SelectSubset<T, ContextPackItemCreateArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ContextPackItems.
     * @param {ContextPackItemCreateManyArgs} args - Arguments to create many ContextPackItems.
     * @example
     * // Create many ContextPackItems
     * const contextPackItem = await prisma.contextPackItem.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ContextPackItemCreateManyArgs>(args?: SelectSubset<T, ContextPackItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ContextPackItems and returns the data saved in the database.
     * @param {ContextPackItemCreateManyAndReturnArgs} args - Arguments to create many ContextPackItems.
     * @example
     * // Create many ContextPackItems
     * const contextPackItem = await prisma.contextPackItem.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ContextPackItems and only return the `id`
     * const contextPackItemWithIdOnly = await prisma.contextPackItem.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ContextPackItemCreateManyAndReturnArgs>(args?: SelectSubset<T, ContextPackItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ContextPackItem.
     * @param {ContextPackItemDeleteArgs} args - Arguments to delete one ContextPackItem.
     * @example
     * // Delete one ContextPackItem
     * const ContextPackItem = await prisma.contextPackItem.delete({
     *   where: {
     *     // ... filter to delete one ContextPackItem
     *   }
     * })
     * 
     */
    delete<T extends ContextPackItemDeleteArgs>(args: SelectSubset<T, ContextPackItemDeleteArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ContextPackItem.
     * @param {ContextPackItemUpdateArgs} args - Arguments to update one ContextPackItem.
     * @example
     * // Update one ContextPackItem
     * const contextPackItem = await prisma.contextPackItem.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ContextPackItemUpdateArgs>(args: SelectSubset<T, ContextPackItemUpdateArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ContextPackItems.
     * @param {ContextPackItemDeleteManyArgs} args - Arguments to filter ContextPackItems to delete.
     * @example
     * // Delete a few ContextPackItems
     * const { count } = await prisma.contextPackItem.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ContextPackItemDeleteManyArgs>(args?: SelectSubset<T, ContextPackItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ContextPackItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ContextPackItems
     * const contextPackItem = await prisma.contextPackItem.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ContextPackItemUpdateManyArgs>(args: SelectSubset<T, ContextPackItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ContextPackItem.
     * @param {ContextPackItemUpsertArgs} args - Arguments to update or create a ContextPackItem.
     * @example
     * // Update or create a ContextPackItem
     * const contextPackItem = await prisma.contextPackItem.upsert({
     *   create: {
     *     // ... data to create a ContextPackItem
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ContextPackItem we want to update
     *   }
     * })
     */
    upsert<T extends ContextPackItemUpsertArgs>(args: SelectSubset<T, ContextPackItemUpsertArgs<ExtArgs>>): Prisma__ContextPackItemClient<$Result.GetResult<Prisma.$ContextPackItemPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ContextPackItems.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemCountArgs} args - Arguments to filter ContextPackItems to count.
     * @example
     * // Count the number of ContextPackItems
     * const count = await prisma.contextPackItem.count({
     *   where: {
     *     // ... the filter for the ContextPackItems we want to count
     *   }
     * })
    **/
    count<T extends ContextPackItemCountArgs>(
      args?: Subset<T, ContextPackItemCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ContextPackItemCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ContextPackItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ContextPackItemAggregateArgs>(args: Subset<T, ContextPackItemAggregateArgs>): Prisma.PrismaPromise<GetContextPackItemAggregateType<T>>

    /**
     * Group by ContextPackItem.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ContextPackItemGroupByArgs} args - Group by arguments.
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
      T extends ContextPackItemGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ContextPackItemGroupByArgs['orderBy'] }
        : { orderBy?: ContextPackItemGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ContextPackItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetContextPackItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ContextPackItem model
   */
  readonly fields: ContextPackItemFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ContextPackItem.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ContextPackItemClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    contextPack<T extends ContextPackDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ContextPackDefaultArgs<ExtArgs>>): Prisma__ContextPackClient<$Result.GetResult<Prisma.$ContextPackPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the ContextPackItem model
   */ 
  interface ContextPackItemFieldRefs {
    readonly id: FieldRef<"ContextPackItem", 'String'>
    readonly contextPackId: FieldRef<"ContextPackItem", 'String'>
    readonly type: FieldRef<"ContextPackItem", 'String'>
    readonly content: FieldRef<"ContextPackItem", 'String'>
    readonly fileId: FieldRef<"ContextPackItem", 'String'>
    readonly sortOrder: FieldRef<"ContextPackItem", 'Int'>
    readonly createdAt: FieldRef<"ContextPackItem", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ContextPackItem findUnique
   */
  export type ContextPackItemFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * Filter, which ContextPackItem to fetch.
     */
    where: ContextPackItemWhereUniqueInput
  }

  /**
   * ContextPackItem findUniqueOrThrow
   */
  export type ContextPackItemFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * Filter, which ContextPackItem to fetch.
     */
    where: ContextPackItemWhereUniqueInput
  }

  /**
   * ContextPackItem findFirst
   */
  export type ContextPackItemFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * Filter, which ContextPackItem to fetch.
     */
    where?: ContextPackItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPackItems to fetch.
     */
    orderBy?: ContextPackItemOrderByWithRelationInput | ContextPackItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContextPackItems.
     */
    cursor?: ContextPackItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPackItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPackItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContextPackItems.
     */
    distinct?: ContextPackItemScalarFieldEnum | ContextPackItemScalarFieldEnum[]
  }

  /**
   * ContextPackItem findFirstOrThrow
   */
  export type ContextPackItemFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * Filter, which ContextPackItem to fetch.
     */
    where?: ContextPackItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPackItems to fetch.
     */
    orderBy?: ContextPackItemOrderByWithRelationInput | ContextPackItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ContextPackItems.
     */
    cursor?: ContextPackItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPackItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPackItems.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ContextPackItems.
     */
    distinct?: ContextPackItemScalarFieldEnum | ContextPackItemScalarFieldEnum[]
  }

  /**
   * ContextPackItem findMany
   */
  export type ContextPackItemFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * Filter, which ContextPackItems to fetch.
     */
    where?: ContextPackItemWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ContextPackItems to fetch.
     */
    orderBy?: ContextPackItemOrderByWithRelationInput | ContextPackItemOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ContextPackItems.
     */
    cursor?: ContextPackItemWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ContextPackItems from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ContextPackItems.
     */
    skip?: number
    distinct?: ContextPackItemScalarFieldEnum | ContextPackItemScalarFieldEnum[]
  }

  /**
   * ContextPackItem create
   */
  export type ContextPackItemCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * The data needed to create a ContextPackItem.
     */
    data: XOR<ContextPackItemCreateInput, ContextPackItemUncheckedCreateInput>
  }

  /**
   * ContextPackItem createMany
   */
  export type ContextPackItemCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ContextPackItems.
     */
    data: ContextPackItemCreateManyInput | ContextPackItemCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ContextPackItem createManyAndReturn
   */
  export type ContextPackItemCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ContextPackItems.
     */
    data: ContextPackItemCreateManyInput | ContextPackItemCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ContextPackItem update
   */
  export type ContextPackItemUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * The data needed to update a ContextPackItem.
     */
    data: XOR<ContextPackItemUpdateInput, ContextPackItemUncheckedUpdateInput>
    /**
     * Choose, which ContextPackItem to update.
     */
    where: ContextPackItemWhereUniqueInput
  }

  /**
   * ContextPackItem updateMany
   */
  export type ContextPackItemUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ContextPackItems.
     */
    data: XOR<ContextPackItemUpdateManyMutationInput, ContextPackItemUncheckedUpdateManyInput>
    /**
     * Filter which ContextPackItems to update
     */
    where?: ContextPackItemWhereInput
  }

  /**
   * ContextPackItem upsert
   */
  export type ContextPackItemUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * The filter to search for the ContextPackItem to update in case it exists.
     */
    where: ContextPackItemWhereUniqueInput
    /**
     * In case the ContextPackItem found by the `where` argument doesn't exist, create a new ContextPackItem with this data.
     */
    create: XOR<ContextPackItemCreateInput, ContextPackItemUncheckedCreateInput>
    /**
     * In case the ContextPackItem was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ContextPackItemUpdateInput, ContextPackItemUncheckedUpdateInput>
  }

  /**
   * ContextPackItem delete
   */
  export type ContextPackItemDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
    /**
     * Filter which ContextPackItem to delete.
     */
    where: ContextPackItemWhereUniqueInput
  }

  /**
   * ContextPackItem deleteMany
   */
  export type ContextPackItemDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ContextPackItems to delete
     */
    where?: ContextPackItemWhereInput
  }

  /**
   * ContextPackItem without action
   */
  export type ContextPackItemDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ContextPackItem
     */
    select?: ContextPackItemSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ContextPackItemInclude<ExtArgs> | null
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


  export const MemoryRecordScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    type: 'type',
    content: 'content',
    sourceThreadId: 'sourceThreadId',
    sourceMessageId: 'sourceMessageId',
    isEnabled: 'isEnabled',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type MemoryRecordScalarFieldEnum = (typeof MemoryRecordScalarFieldEnum)[keyof typeof MemoryRecordScalarFieldEnum]


  export const ContextPackScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    description: 'description',
    scope: 'scope',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ContextPackScalarFieldEnum = (typeof ContextPackScalarFieldEnum)[keyof typeof ContextPackScalarFieldEnum]


  export const ContextPackItemScalarFieldEnum: {
    id: 'id',
    contextPackId: 'contextPackId',
    type: 'type',
    content: 'content',
    fileId: 'fileId',
    sortOrder: 'sortOrder',
    createdAt: 'createdAt'
  };

  export type ContextPackItemScalarFieldEnum = (typeof ContextPackItemScalarFieldEnum)[keyof typeof ContextPackItemScalarFieldEnum]


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
   * Reference to a field of type 'MemoryType'
   */
  export type EnumMemoryTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MemoryType'>
    


  /**
   * Reference to a field of type 'MemoryType[]'
   */
  export type ListEnumMemoryTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MemoryType[]'>
    


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
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


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


  export type MemoryRecordWhereInput = {
    AND?: MemoryRecordWhereInput | MemoryRecordWhereInput[]
    OR?: MemoryRecordWhereInput[]
    NOT?: MemoryRecordWhereInput | MemoryRecordWhereInput[]
    id?: StringFilter<"MemoryRecord"> | string
    userId?: StringFilter<"MemoryRecord"> | string
    type?: EnumMemoryTypeFilter<"MemoryRecord"> | $Enums.MemoryType
    content?: StringFilter<"MemoryRecord"> | string
    sourceThreadId?: StringNullableFilter<"MemoryRecord"> | string | null
    sourceMessageId?: StringNullableFilter<"MemoryRecord"> | string | null
    isEnabled?: BoolFilter<"MemoryRecord"> | boolean
    createdAt?: DateTimeFilter<"MemoryRecord"> | Date | string
    updatedAt?: DateTimeFilter<"MemoryRecord"> | Date | string
  }

  export type MemoryRecordOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    sourceThreadId?: SortOrderInput | SortOrder
    sourceMessageId?: SortOrderInput | SortOrder
    isEnabled?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MemoryRecordWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MemoryRecordWhereInput | MemoryRecordWhereInput[]
    OR?: MemoryRecordWhereInput[]
    NOT?: MemoryRecordWhereInput | MemoryRecordWhereInput[]
    userId?: StringFilter<"MemoryRecord"> | string
    type?: EnumMemoryTypeFilter<"MemoryRecord"> | $Enums.MemoryType
    content?: StringFilter<"MemoryRecord"> | string
    sourceThreadId?: StringNullableFilter<"MemoryRecord"> | string | null
    sourceMessageId?: StringNullableFilter<"MemoryRecord"> | string | null
    isEnabled?: BoolFilter<"MemoryRecord"> | boolean
    createdAt?: DateTimeFilter<"MemoryRecord"> | Date | string
    updatedAt?: DateTimeFilter<"MemoryRecord"> | Date | string
  }, "id">

  export type MemoryRecordOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    sourceThreadId?: SortOrderInput | SortOrder
    sourceMessageId?: SortOrderInput | SortOrder
    isEnabled?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: MemoryRecordCountOrderByAggregateInput
    _max?: MemoryRecordMaxOrderByAggregateInput
    _min?: MemoryRecordMinOrderByAggregateInput
  }

  export type MemoryRecordScalarWhereWithAggregatesInput = {
    AND?: MemoryRecordScalarWhereWithAggregatesInput | MemoryRecordScalarWhereWithAggregatesInput[]
    OR?: MemoryRecordScalarWhereWithAggregatesInput[]
    NOT?: MemoryRecordScalarWhereWithAggregatesInput | MemoryRecordScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MemoryRecord"> | string
    userId?: StringWithAggregatesFilter<"MemoryRecord"> | string
    type?: EnumMemoryTypeWithAggregatesFilter<"MemoryRecord"> | $Enums.MemoryType
    content?: StringWithAggregatesFilter<"MemoryRecord"> | string
    sourceThreadId?: StringNullableWithAggregatesFilter<"MemoryRecord"> | string | null
    sourceMessageId?: StringNullableWithAggregatesFilter<"MemoryRecord"> | string | null
    isEnabled?: BoolWithAggregatesFilter<"MemoryRecord"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"MemoryRecord"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"MemoryRecord"> | Date | string
  }

  export type ContextPackWhereInput = {
    AND?: ContextPackWhereInput | ContextPackWhereInput[]
    OR?: ContextPackWhereInput[]
    NOT?: ContextPackWhereInput | ContextPackWhereInput[]
    id?: StringFilter<"ContextPack"> | string
    userId?: StringFilter<"ContextPack"> | string
    name?: StringFilter<"ContextPack"> | string
    description?: StringNullableFilter<"ContextPack"> | string | null
    scope?: StringNullableFilter<"ContextPack"> | string | null
    createdAt?: DateTimeFilter<"ContextPack"> | Date | string
    updatedAt?: DateTimeFilter<"ContextPack"> | Date | string
    items?: ContextPackItemListRelationFilter
  }

  export type ContextPackOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    items?: ContextPackItemOrderByRelationAggregateInput
  }

  export type ContextPackWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ContextPackWhereInput | ContextPackWhereInput[]
    OR?: ContextPackWhereInput[]
    NOT?: ContextPackWhereInput | ContextPackWhereInput[]
    userId?: StringFilter<"ContextPack"> | string
    name?: StringFilter<"ContextPack"> | string
    description?: StringNullableFilter<"ContextPack"> | string | null
    scope?: StringNullableFilter<"ContextPack"> | string | null
    createdAt?: DateTimeFilter<"ContextPack"> | Date | string
    updatedAt?: DateTimeFilter<"ContextPack"> | Date | string
    items?: ContextPackItemListRelationFilter
  }, "id">

  export type ContextPackOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    scope?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ContextPackCountOrderByAggregateInput
    _max?: ContextPackMaxOrderByAggregateInput
    _min?: ContextPackMinOrderByAggregateInput
  }

  export type ContextPackScalarWhereWithAggregatesInput = {
    AND?: ContextPackScalarWhereWithAggregatesInput | ContextPackScalarWhereWithAggregatesInput[]
    OR?: ContextPackScalarWhereWithAggregatesInput[]
    NOT?: ContextPackScalarWhereWithAggregatesInput | ContextPackScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ContextPack"> | string
    userId?: StringWithAggregatesFilter<"ContextPack"> | string
    name?: StringWithAggregatesFilter<"ContextPack"> | string
    description?: StringNullableWithAggregatesFilter<"ContextPack"> | string | null
    scope?: StringNullableWithAggregatesFilter<"ContextPack"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ContextPack"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ContextPack"> | Date | string
  }

  export type ContextPackItemWhereInput = {
    AND?: ContextPackItemWhereInput | ContextPackItemWhereInput[]
    OR?: ContextPackItemWhereInput[]
    NOT?: ContextPackItemWhereInput | ContextPackItemWhereInput[]
    id?: StringFilter<"ContextPackItem"> | string
    contextPackId?: StringFilter<"ContextPackItem"> | string
    type?: StringFilter<"ContextPackItem"> | string
    content?: StringNullableFilter<"ContextPackItem"> | string | null
    fileId?: StringNullableFilter<"ContextPackItem"> | string | null
    sortOrder?: IntFilter<"ContextPackItem"> | number
    createdAt?: DateTimeFilter<"ContextPackItem"> | Date | string
    contextPack?: XOR<ContextPackRelationFilter, ContextPackWhereInput>
  }

  export type ContextPackItemOrderByWithRelationInput = {
    id?: SortOrder
    contextPackId?: SortOrder
    type?: SortOrder
    content?: SortOrderInput | SortOrder
    fileId?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    contextPack?: ContextPackOrderByWithRelationInput
  }

  export type ContextPackItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ContextPackItemWhereInput | ContextPackItemWhereInput[]
    OR?: ContextPackItemWhereInput[]
    NOT?: ContextPackItemWhereInput | ContextPackItemWhereInput[]
    contextPackId?: StringFilter<"ContextPackItem"> | string
    type?: StringFilter<"ContextPackItem"> | string
    content?: StringNullableFilter<"ContextPackItem"> | string | null
    fileId?: StringNullableFilter<"ContextPackItem"> | string | null
    sortOrder?: IntFilter<"ContextPackItem"> | number
    createdAt?: DateTimeFilter<"ContextPackItem"> | Date | string
    contextPack?: XOR<ContextPackRelationFilter, ContextPackWhereInput>
  }, "id">

  export type ContextPackItemOrderByWithAggregationInput = {
    id?: SortOrder
    contextPackId?: SortOrder
    type?: SortOrder
    content?: SortOrderInput | SortOrder
    fileId?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
    _count?: ContextPackItemCountOrderByAggregateInput
    _avg?: ContextPackItemAvgOrderByAggregateInput
    _max?: ContextPackItemMaxOrderByAggregateInput
    _min?: ContextPackItemMinOrderByAggregateInput
    _sum?: ContextPackItemSumOrderByAggregateInput
  }

  export type ContextPackItemScalarWhereWithAggregatesInput = {
    AND?: ContextPackItemScalarWhereWithAggregatesInput | ContextPackItemScalarWhereWithAggregatesInput[]
    OR?: ContextPackItemScalarWhereWithAggregatesInput[]
    NOT?: ContextPackItemScalarWhereWithAggregatesInput | ContextPackItemScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ContextPackItem"> | string
    contextPackId?: StringWithAggregatesFilter<"ContextPackItem"> | string
    type?: StringWithAggregatesFilter<"ContextPackItem"> | string
    content?: StringNullableWithAggregatesFilter<"ContextPackItem"> | string | null
    fileId?: StringNullableWithAggregatesFilter<"ContextPackItem"> | string | null
    sortOrder?: IntWithAggregatesFilter<"ContextPackItem"> | number
    createdAt?: DateTimeWithAggregatesFilter<"ContextPackItem"> | Date | string
  }

  export type MemoryRecordCreateInput = {
    id?: string
    userId: string
    type: $Enums.MemoryType
    content: string
    sourceThreadId?: string | null
    sourceMessageId?: string | null
    isEnabled?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MemoryRecordUncheckedCreateInput = {
    id?: string
    userId: string
    type: $Enums.MemoryType
    content: string
    sourceThreadId?: string | null
    sourceMessageId?: string | null
    isEnabled?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MemoryRecordUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: EnumMemoryTypeFieldUpdateOperationsInput | $Enums.MemoryType
    content?: StringFieldUpdateOperationsInput | string
    sourceThreadId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MemoryRecordUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: EnumMemoryTypeFieldUpdateOperationsInput | $Enums.MemoryType
    content?: StringFieldUpdateOperationsInput | string
    sourceThreadId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MemoryRecordCreateManyInput = {
    id?: string
    userId: string
    type: $Enums.MemoryType
    content: string
    sourceThreadId?: string | null
    sourceMessageId?: string | null
    isEnabled?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type MemoryRecordUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: EnumMemoryTypeFieldUpdateOperationsInput | $Enums.MemoryType
    content?: StringFieldUpdateOperationsInput | string
    sourceThreadId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MemoryRecordUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    type?: EnumMemoryTypeFieldUpdateOperationsInput | $Enums.MemoryType
    content?: StringFieldUpdateOperationsInput | string
    sourceThreadId?: NullableStringFieldUpdateOperationsInput | string | null
    sourceMessageId?: NullableStringFieldUpdateOperationsInput | string | null
    isEnabled?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackCreateInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    scope?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: ContextPackItemCreateNestedManyWithoutContextPackInput
  }

  export type ContextPackUncheckedCreateInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    scope?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    items?: ContextPackItemUncheckedCreateNestedManyWithoutContextPackInput
  }

  export type ContextPackUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: ContextPackItemUpdateManyWithoutContextPackNestedInput
  }

  export type ContextPackUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    items?: ContextPackItemUncheckedUpdateManyWithoutContextPackNestedInput
  }

  export type ContextPackCreateManyInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    scope?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ContextPackUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackItemCreateInput = {
    id?: string
    type: string
    content?: string | null
    fileId?: string | null
    sortOrder?: number
    createdAt?: Date | string
    contextPack: ContextPackCreateNestedOneWithoutItemsInput
  }

  export type ContextPackItemUncheckedCreateInput = {
    id?: string
    contextPackId: string
    type: string
    content?: string | null
    fileId?: string | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type ContextPackItemUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    contextPack?: ContextPackUpdateOneRequiredWithoutItemsNestedInput
  }

  export type ContextPackItemUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    contextPackId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackItemCreateManyInput = {
    id?: string
    contextPackId: string
    type: string
    content?: string | null
    fileId?: string | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type ContextPackItemUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackItemUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    contextPackId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
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

  export type EnumMemoryTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.MemoryType | EnumMemoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMemoryTypeFilter<$PrismaModel> | $Enums.MemoryType
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

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type MemoryRecordCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    sourceThreadId?: SortOrder
    sourceMessageId?: SortOrder
    isEnabled?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MemoryRecordMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    sourceThreadId?: SortOrder
    sourceMessageId?: SortOrder
    isEnabled?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type MemoryRecordMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    sourceThreadId?: SortOrder
    sourceMessageId?: SortOrder
    isEnabled?: SortOrder
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

  export type EnumMemoryTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MemoryType | EnumMemoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMemoryTypeWithAggregatesFilter<$PrismaModel> | $Enums.MemoryType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMemoryTypeFilter<$PrismaModel>
    _max?: NestedEnumMemoryTypeFilter<$PrismaModel>
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

  export type ContextPackItemListRelationFilter = {
    every?: ContextPackItemWhereInput
    some?: ContextPackItemWhereInput
    none?: ContextPackItemWhereInput
  }

  export type ContextPackItemOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ContextPackCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ContextPackMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ContextPackMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    description?: SortOrder
    scope?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
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

  export type ContextPackRelationFilter = {
    is?: ContextPackWhereInput
    isNot?: ContextPackWhereInput
  }

  export type ContextPackItemCountOrderByAggregateInput = {
    id?: SortOrder
    contextPackId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    fileId?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
  }

  export type ContextPackItemAvgOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type ContextPackItemMaxOrderByAggregateInput = {
    id?: SortOrder
    contextPackId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    fileId?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
  }

  export type ContextPackItemMinOrderByAggregateInput = {
    id?: SortOrder
    contextPackId?: SortOrder
    type?: SortOrder
    content?: SortOrder
    fileId?: SortOrder
    sortOrder?: SortOrder
    createdAt?: SortOrder
  }

  export type ContextPackItemSumOrderByAggregateInput = {
    sortOrder?: SortOrder
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

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumMemoryTypeFieldUpdateOperationsInput = {
    set?: $Enums.MemoryType
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

  export type ContextPackItemCreateNestedManyWithoutContextPackInput = {
    create?: XOR<ContextPackItemCreateWithoutContextPackInput, ContextPackItemUncheckedCreateWithoutContextPackInput> | ContextPackItemCreateWithoutContextPackInput[] | ContextPackItemUncheckedCreateWithoutContextPackInput[]
    connectOrCreate?: ContextPackItemCreateOrConnectWithoutContextPackInput | ContextPackItemCreateOrConnectWithoutContextPackInput[]
    createMany?: ContextPackItemCreateManyContextPackInputEnvelope
    connect?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
  }

  export type ContextPackItemUncheckedCreateNestedManyWithoutContextPackInput = {
    create?: XOR<ContextPackItemCreateWithoutContextPackInput, ContextPackItemUncheckedCreateWithoutContextPackInput> | ContextPackItemCreateWithoutContextPackInput[] | ContextPackItemUncheckedCreateWithoutContextPackInput[]
    connectOrCreate?: ContextPackItemCreateOrConnectWithoutContextPackInput | ContextPackItemCreateOrConnectWithoutContextPackInput[]
    createMany?: ContextPackItemCreateManyContextPackInputEnvelope
    connect?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
  }

  export type ContextPackItemUpdateManyWithoutContextPackNestedInput = {
    create?: XOR<ContextPackItemCreateWithoutContextPackInput, ContextPackItemUncheckedCreateWithoutContextPackInput> | ContextPackItemCreateWithoutContextPackInput[] | ContextPackItemUncheckedCreateWithoutContextPackInput[]
    connectOrCreate?: ContextPackItemCreateOrConnectWithoutContextPackInput | ContextPackItemCreateOrConnectWithoutContextPackInput[]
    upsert?: ContextPackItemUpsertWithWhereUniqueWithoutContextPackInput | ContextPackItemUpsertWithWhereUniqueWithoutContextPackInput[]
    createMany?: ContextPackItemCreateManyContextPackInputEnvelope
    set?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    disconnect?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    delete?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    connect?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    update?: ContextPackItemUpdateWithWhereUniqueWithoutContextPackInput | ContextPackItemUpdateWithWhereUniqueWithoutContextPackInput[]
    updateMany?: ContextPackItemUpdateManyWithWhereWithoutContextPackInput | ContextPackItemUpdateManyWithWhereWithoutContextPackInput[]
    deleteMany?: ContextPackItemScalarWhereInput | ContextPackItemScalarWhereInput[]
  }

  export type ContextPackItemUncheckedUpdateManyWithoutContextPackNestedInput = {
    create?: XOR<ContextPackItemCreateWithoutContextPackInput, ContextPackItemUncheckedCreateWithoutContextPackInput> | ContextPackItemCreateWithoutContextPackInput[] | ContextPackItemUncheckedCreateWithoutContextPackInput[]
    connectOrCreate?: ContextPackItemCreateOrConnectWithoutContextPackInput | ContextPackItemCreateOrConnectWithoutContextPackInput[]
    upsert?: ContextPackItemUpsertWithWhereUniqueWithoutContextPackInput | ContextPackItemUpsertWithWhereUniqueWithoutContextPackInput[]
    createMany?: ContextPackItemCreateManyContextPackInputEnvelope
    set?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    disconnect?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    delete?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    connect?: ContextPackItemWhereUniqueInput | ContextPackItemWhereUniqueInput[]
    update?: ContextPackItemUpdateWithWhereUniqueWithoutContextPackInput | ContextPackItemUpdateWithWhereUniqueWithoutContextPackInput[]
    updateMany?: ContextPackItemUpdateManyWithWhereWithoutContextPackInput | ContextPackItemUpdateManyWithWhereWithoutContextPackInput[]
    deleteMany?: ContextPackItemScalarWhereInput | ContextPackItemScalarWhereInput[]
  }

  export type ContextPackCreateNestedOneWithoutItemsInput = {
    create?: XOR<ContextPackCreateWithoutItemsInput, ContextPackUncheckedCreateWithoutItemsInput>
    connectOrCreate?: ContextPackCreateOrConnectWithoutItemsInput
    connect?: ContextPackWhereUniqueInput
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ContextPackUpdateOneRequiredWithoutItemsNestedInput = {
    create?: XOR<ContextPackCreateWithoutItemsInput, ContextPackUncheckedCreateWithoutItemsInput>
    connectOrCreate?: ContextPackCreateOrConnectWithoutItemsInput
    upsert?: ContextPackUpsertWithoutItemsInput
    connect?: ContextPackWhereUniqueInput
    update?: XOR<XOR<ContextPackUpdateToOneWithWhereWithoutItemsInput, ContextPackUpdateWithoutItemsInput>, ContextPackUncheckedUpdateWithoutItemsInput>
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

  export type NestedEnumMemoryTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.MemoryType | EnumMemoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMemoryTypeFilter<$PrismaModel> | $Enums.MemoryType
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

  export type NestedEnumMemoryTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MemoryType | EnumMemoryTypeFieldRefInput<$PrismaModel>
    in?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.MemoryType[] | ListEnumMemoryTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumMemoryTypeWithAggregatesFilter<$PrismaModel> | $Enums.MemoryType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMemoryTypeFilter<$PrismaModel>
    _max?: NestedEnumMemoryTypeFilter<$PrismaModel>
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

  export type ContextPackItemCreateWithoutContextPackInput = {
    id?: string
    type: string
    content?: string | null
    fileId?: string | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type ContextPackItemUncheckedCreateWithoutContextPackInput = {
    id?: string
    type: string
    content?: string | null
    fileId?: string | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type ContextPackItemCreateOrConnectWithoutContextPackInput = {
    where: ContextPackItemWhereUniqueInput
    create: XOR<ContextPackItemCreateWithoutContextPackInput, ContextPackItemUncheckedCreateWithoutContextPackInput>
  }

  export type ContextPackItemCreateManyContextPackInputEnvelope = {
    data: ContextPackItemCreateManyContextPackInput | ContextPackItemCreateManyContextPackInput[]
    skipDuplicates?: boolean
  }

  export type ContextPackItemUpsertWithWhereUniqueWithoutContextPackInput = {
    where: ContextPackItemWhereUniqueInput
    update: XOR<ContextPackItemUpdateWithoutContextPackInput, ContextPackItemUncheckedUpdateWithoutContextPackInput>
    create: XOR<ContextPackItemCreateWithoutContextPackInput, ContextPackItemUncheckedCreateWithoutContextPackInput>
  }

  export type ContextPackItemUpdateWithWhereUniqueWithoutContextPackInput = {
    where: ContextPackItemWhereUniqueInput
    data: XOR<ContextPackItemUpdateWithoutContextPackInput, ContextPackItemUncheckedUpdateWithoutContextPackInput>
  }

  export type ContextPackItemUpdateManyWithWhereWithoutContextPackInput = {
    where: ContextPackItemScalarWhereInput
    data: XOR<ContextPackItemUpdateManyMutationInput, ContextPackItemUncheckedUpdateManyWithoutContextPackInput>
  }

  export type ContextPackItemScalarWhereInput = {
    AND?: ContextPackItemScalarWhereInput | ContextPackItemScalarWhereInput[]
    OR?: ContextPackItemScalarWhereInput[]
    NOT?: ContextPackItemScalarWhereInput | ContextPackItemScalarWhereInput[]
    id?: StringFilter<"ContextPackItem"> | string
    contextPackId?: StringFilter<"ContextPackItem"> | string
    type?: StringFilter<"ContextPackItem"> | string
    content?: StringNullableFilter<"ContextPackItem"> | string | null
    fileId?: StringNullableFilter<"ContextPackItem"> | string | null
    sortOrder?: IntFilter<"ContextPackItem"> | number
    createdAt?: DateTimeFilter<"ContextPackItem"> | Date | string
  }

  export type ContextPackCreateWithoutItemsInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    scope?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ContextPackUncheckedCreateWithoutItemsInput = {
    id?: string
    userId: string
    name: string
    description?: string | null
    scope?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ContextPackCreateOrConnectWithoutItemsInput = {
    where: ContextPackWhereUniqueInput
    create: XOR<ContextPackCreateWithoutItemsInput, ContextPackUncheckedCreateWithoutItemsInput>
  }

  export type ContextPackUpsertWithoutItemsInput = {
    update: XOR<ContextPackUpdateWithoutItemsInput, ContextPackUncheckedUpdateWithoutItemsInput>
    create: XOR<ContextPackCreateWithoutItemsInput, ContextPackUncheckedCreateWithoutItemsInput>
    where?: ContextPackWhereInput
  }

  export type ContextPackUpdateToOneWithWhereWithoutItemsInput = {
    where?: ContextPackWhereInput
    data: XOR<ContextPackUpdateWithoutItemsInput, ContextPackUncheckedUpdateWithoutItemsInput>
  }

  export type ContextPackUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackUncheckedUpdateWithoutItemsInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    scope?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackItemCreateManyContextPackInput = {
    id?: string
    type: string
    content?: string | null
    fileId?: string | null
    sortOrder?: number
    createdAt?: Date | string
  }

  export type ContextPackItemUpdateWithoutContextPackInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackItemUncheckedUpdateWithoutContextPackInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ContextPackItemUncheckedUpdateManyWithoutContextPackInput = {
    id?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    content?: NullableStringFieldUpdateOperationsInput | string | null
    fileId?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ContextPackCountOutputTypeDefaultArgs instead
     */
    export type ContextPackCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ContextPackCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MemoryRecordDefaultArgs instead
     */
    export type MemoryRecordArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MemoryRecordDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ContextPackDefaultArgs instead
     */
    export type ContextPackArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ContextPackDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ContextPackItemDefaultArgs instead
     */
    export type ContextPackItemArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ContextPackItemDefaultArgs<ExtArgs>

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