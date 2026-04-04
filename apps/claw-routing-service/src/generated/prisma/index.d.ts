
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
 * Model RoutingDecision
 * 
 */
export type RoutingDecision = $Result.DefaultSelection<Prisma.$RoutingDecisionPayload>
/**
 * Model RoutingPolicy
 * 
 */
export type RoutingPolicy = $Result.DefaultSelection<Prisma.$RoutingPolicyPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const RoutingMode: {
  AUTO: 'AUTO',
  MANUAL_MODEL: 'MANUAL_MODEL',
  LOCAL_ONLY: 'LOCAL_ONLY',
  PRIVACY_FIRST: 'PRIVACY_FIRST',
  LOW_LATENCY: 'LOW_LATENCY',
  HIGH_REASONING: 'HIGH_REASONING',
  COST_SAVER: 'COST_SAVER'
};

export type RoutingMode = (typeof RoutingMode)[keyof typeof RoutingMode]

}

export type RoutingMode = $Enums.RoutingMode

export const RoutingMode: typeof $Enums.RoutingMode

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more RoutingDecisions
 * const routingDecisions = await prisma.routingDecision.findMany()
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
   * // Fetch zero or more RoutingDecisions
   * const routingDecisions = await prisma.routingDecision.findMany()
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
   * `prisma.routingDecision`: Exposes CRUD operations for the **RoutingDecision** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RoutingDecisions
    * const routingDecisions = await prisma.routingDecision.findMany()
    * ```
    */
  get routingDecision(): Prisma.RoutingDecisionDelegate<ExtArgs>;

  /**
   * `prisma.routingPolicy`: Exposes CRUD operations for the **RoutingPolicy** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more RoutingPolicies
    * const routingPolicies = await prisma.routingPolicy.findMany()
    * ```
    */
  get routingPolicy(): Prisma.RoutingPolicyDelegate<ExtArgs>;
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
    RoutingDecision: 'RoutingDecision',
    RoutingPolicy: 'RoutingPolicy'
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
      modelProps: "routingDecision" | "routingPolicy"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      RoutingDecision: {
        payload: Prisma.$RoutingDecisionPayload<ExtArgs>
        fields: Prisma.RoutingDecisionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RoutingDecisionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RoutingDecisionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>
          }
          findFirst: {
            args: Prisma.RoutingDecisionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RoutingDecisionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>
          }
          findMany: {
            args: Prisma.RoutingDecisionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>[]
          }
          create: {
            args: Prisma.RoutingDecisionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>
          }
          createMany: {
            args: Prisma.RoutingDecisionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RoutingDecisionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>[]
          }
          delete: {
            args: Prisma.RoutingDecisionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>
          }
          update: {
            args: Prisma.RoutingDecisionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>
          }
          deleteMany: {
            args: Prisma.RoutingDecisionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RoutingDecisionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RoutingDecisionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingDecisionPayload>
          }
          aggregate: {
            args: Prisma.RoutingDecisionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoutingDecision>
          }
          groupBy: {
            args: Prisma.RoutingDecisionGroupByArgs<ExtArgs>
            result: $Utils.Optional<RoutingDecisionGroupByOutputType>[]
          }
          count: {
            args: Prisma.RoutingDecisionCountArgs<ExtArgs>
            result: $Utils.Optional<RoutingDecisionCountAggregateOutputType> | number
          }
        }
      }
      RoutingPolicy: {
        payload: Prisma.$RoutingPolicyPayload<ExtArgs>
        fields: Prisma.RoutingPolicyFieldRefs
        operations: {
          findUnique: {
            args: Prisma.RoutingPolicyFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.RoutingPolicyFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>
          }
          findFirst: {
            args: Prisma.RoutingPolicyFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.RoutingPolicyFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>
          }
          findMany: {
            args: Prisma.RoutingPolicyFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>[]
          }
          create: {
            args: Prisma.RoutingPolicyCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>
          }
          createMany: {
            args: Prisma.RoutingPolicyCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.RoutingPolicyCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>[]
          }
          delete: {
            args: Prisma.RoutingPolicyDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>
          }
          update: {
            args: Prisma.RoutingPolicyUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>
          }
          deleteMany: {
            args: Prisma.RoutingPolicyDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.RoutingPolicyUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.RoutingPolicyUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$RoutingPolicyPayload>
          }
          aggregate: {
            args: Prisma.RoutingPolicyAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateRoutingPolicy>
          }
          groupBy: {
            args: Prisma.RoutingPolicyGroupByArgs<ExtArgs>
            result: $Utils.Optional<RoutingPolicyGroupByOutputType>[]
          }
          count: {
            args: Prisma.RoutingPolicyCountArgs<ExtArgs>
            result: $Utils.Optional<RoutingPolicyCountAggregateOutputType> | number
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
   * Models
   */

  /**
   * Model RoutingDecision
   */

  export type AggregateRoutingDecision = {
    _count: RoutingDecisionCountAggregateOutputType | null
    _avg: RoutingDecisionAvgAggregateOutputType | null
    _sum: RoutingDecisionSumAggregateOutputType | null
    _min: RoutingDecisionMinAggregateOutputType | null
    _max: RoutingDecisionMaxAggregateOutputType | null
  }

  export type RoutingDecisionAvgAggregateOutputType = {
    confidence: Decimal | null
  }

  export type RoutingDecisionSumAggregateOutputType = {
    confidence: Decimal | null
  }

  export type RoutingDecisionMinAggregateOutputType = {
    id: string | null
    messageId: string | null
    threadId: string | null
    selectedProvider: string | null
    selectedModel: string | null
    routingMode: $Enums.RoutingMode | null
    confidence: Decimal | null
    privacyClass: string | null
    costClass: string | null
    fallbackProvider: string | null
    fallbackModel: string | null
    createdAt: Date | null
  }

  export type RoutingDecisionMaxAggregateOutputType = {
    id: string | null
    messageId: string | null
    threadId: string | null
    selectedProvider: string | null
    selectedModel: string | null
    routingMode: $Enums.RoutingMode | null
    confidence: Decimal | null
    privacyClass: string | null
    costClass: string | null
    fallbackProvider: string | null
    fallbackModel: string | null
    createdAt: Date | null
  }

  export type RoutingDecisionCountAggregateOutputType = {
    id: number
    messageId: number
    threadId: number
    selectedProvider: number
    selectedModel: number
    routingMode: number
    confidence: number
    reasonTags: number
    privacyClass: number
    costClass: number
    fallbackProvider: number
    fallbackModel: number
    createdAt: number
    _all: number
  }


  export type RoutingDecisionAvgAggregateInputType = {
    confidence?: true
  }

  export type RoutingDecisionSumAggregateInputType = {
    confidence?: true
  }

  export type RoutingDecisionMinAggregateInputType = {
    id?: true
    messageId?: true
    threadId?: true
    selectedProvider?: true
    selectedModel?: true
    routingMode?: true
    confidence?: true
    privacyClass?: true
    costClass?: true
    fallbackProvider?: true
    fallbackModel?: true
    createdAt?: true
  }

  export type RoutingDecisionMaxAggregateInputType = {
    id?: true
    messageId?: true
    threadId?: true
    selectedProvider?: true
    selectedModel?: true
    routingMode?: true
    confidence?: true
    privacyClass?: true
    costClass?: true
    fallbackProvider?: true
    fallbackModel?: true
    createdAt?: true
  }

  export type RoutingDecisionCountAggregateInputType = {
    id?: true
    messageId?: true
    threadId?: true
    selectedProvider?: true
    selectedModel?: true
    routingMode?: true
    confidence?: true
    reasonTags?: true
    privacyClass?: true
    costClass?: true
    fallbackProvider?: true
    fallbackModel?: true
    createdAt?: true
    _all?: true
  }

  export type RoutingDecisionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RoutingDecision to aggregate.
     */
    where?: RoutingDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingDecisions to fetch.
     */
    orderBy?: RoutingDecisionOrderByWithRelationInput | RoutingDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RoutingDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingDecisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RoutingDecisions
    **/
    _count?: true | RoutingDecisionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RoutingDecisionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RoutingDecisionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RoutingDecisionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RoutingDecisionMaxAggregateInputType
  }

  export type GetRoutingDecisionAggregateType<T extends RoutingDecisionAggregateArgs> = {
        [P in keyof T & keyof AggregateRoutingDecision]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoutingDecision[P]>
      : GetScalarType<T[P], AggregateRoutingDecision[P]>
  }




  export type RoutingDecisionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoutingDecisionWhereInput
    orderBy?: RoutingDecisionOrderByWithAggregationInput | RoutingDecisionOrderByWithAggregationInput[]
    by: RoutingDecisionScalarFieldEnum[] | RoutingDecisionScalarFieldEnum
    having?: RoutingDecisionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RoutingDecisionCountAggregateInputType | true
    _avg?: RoutingDecisionAvgAggregateInputType
    _sum?: RoutingDecisionSumAggregateInputType
    _min?: RoutingDecisionMinAggregateInputType
    _max?: RoutingDecisionMaxAggregateInputType
  }

  export type RoutingDecisionGroupByOutputType = {
    id: string
    messageId: string | null
    threadId: string
    selectedProvider: string
    selectedModel: string
    routingMode: $Enums.RoutingMode
    confidence: Decimal | null
    reasonTags: string[]
    privacyClass: string | null
    costClass: string | null
    fallbackProvider: string | null
    fallbackModel: string | null
    createdAt: Date
    _count: RoutingDecisionCountAggregateOutputType | null
    _avg: RoutingDecisionAvgAggregateOutputType | null
    _sum: RoutingDecisionSumAggregateOutputType | null
    _min: RoutingDecisionMinAggregateOutputType | null
    _max: RoutingDecisionMaxAggregateOutputType | null
  }

  type GetRoutingDecisionGroupByPayload<T extends RoutingDecisionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RoutingDecisionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RoutingDecisionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RoutingDecisionGroupByOutputType[P]>
            : GetScalarType<T[P], RoutingDecisionGroupByOutputType[P]>
        }
      >
    >


  export type RoutingDecisionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    threadId?: boolean
    selectedProvider?: boolean
    selectedModel?: boolean
    routingMode?: boolean
    confidence?: boolean
    reasonTags?: boolean
    privacyClass?: boolean
    costClass?: boolean
    fallbackProvider?: boolean
    fallbackModel?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["routingDecision"]>

  export type RoutingDecisionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    threadId?: boolean
    selectedProvider?: boolean
    selectedModel?: boolean
    routingMode?: boolean
    confidence?: boolean
    reasonTags?: boolean
    privacyClass?: boolean
    costClass?: boolean
    fallbackProvider?: boolean
    fallbackModel?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["routingDecision"]>

  export type RoutingDecisionSelectScalar = {
    id?: boolean
    messageId?: boolean
    threadId?: boolean
    selectedProvider?: boolean
    selectedModel?: boolean
    routingMode?: boolean
    confidence?: boolean
    reasonTags?: boolean
    privacyClass?: boolean
    costClass?: boolean
    fallbackProvider?: boolean
    fallbackModel?: boolean
    createdAt?: boolean
  }


  export type $RoutingDecisionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RoutingDecision"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      messageId: string | null
      threadId: string
      selectedProvider: string
      selectedModel: string
      routingMode: $Enums.RoutingMode
      confidence: Prisma.Decimal | null
      reasonTags: string[]
      privacyClass: string | null
      costClass: string | null
      fallbackProvider: string | null
      fallbackModel: string | null
      createdAt: Date
    }, ExtArgs["result"]["routingDecision"]>
    composites: {}
  }

  type RoutingDecisionGetPayload<S extends boolean | null | undefined | RoutingDecisionDefaultArgs> = $Result.GetResult<Prisma.$RoutingDecisionPayload, S>

  type RoutingDecisionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RoutingDecisionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RoutingDecisionCountAggregateInputType | true
    }

  export interface RoutingDecisionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RoutingDecision'], meta: { name: 'RoutingDecision' } }
    /**
     * Find zero or one RoutingDecision that matches the filter.
     * @param {RoutingDecisionFindUniqueArgs} args - Arguments to find a RoutingDecision
     * @example
     * // Get one RoutingDecision
     * const routingDecision = await prisma.routingDecision.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RoutingDecisionFindUniqueArgs>(args: SelectSubset<T, RoutingDecisionFindUniqueArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RoutingDecision that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RoutingDecisionFindUniqueOrThrowArgs} args - Arguments to find a RoutingDecision
     * @example
     * // Get one RoutingDecision
     * const routingDecision = await prisma.routingDecision.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RoutingDecisionFindUniqueOrThrowArgs>(args: SelectSubset<T, RoutingDecisionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RoutingDecision that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionFindFirstArgs} args - Arguments to find a RoutingDecision
     * @example
     * // Get one RoutingDecision
     * const routingDecision = await prisma.routingDecision.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RoutingDecisionFindFirstArgs>(args?: SelectSubset<T, RoutingDecisionFindFirstArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RoutingDecision that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionFindFirstOrThrowArgs} args - Arguments to find a RoutingDecision
     * @example
     * // Get one RoutingDecision
     * const routingDecision = await prisma.routingDecision.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RoutingDecisionFindFirstOrThrowArgs>(args?: SelectSubset<T, RoutingDecisionFindFirstOrThrowArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RoutingDecisions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RoutingDecisions
     * const routingDecisions = await prisma.routingDecision.findMany()
     * 
     * // Get first 10 RoutingDecisions
     * const routingDecisions = await prisma.routingDecision.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const routingDecisionWithIdOnly = await prisma.routingDecision.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RoutingDecisionFindManyArgs>(args?: SelectSubset<T, RoutingDecisionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RoutingDecision.
     * @param {RoutingDecisionCreateArgs} args - Arguments to create a RoutingDecision.
     * @example
     * // Create one RoutingDecision
     * const RoutingDecision = await prisma.routingDecision.create({
     *   data: {
     *     // ... data to create a RoutingDecision
     *   }
     * })
     * 
     */
    create<T extends RoutingDecisionCreateArgs>(args: SelectSubset<T, RoutingDecisionCreateArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RoutingDecisions.
     * @param {RoutingDecisionCreateManyArgs} args - Arguments to create many RoutingDecisions.
     * @example
     * // Create many RoutingDecisions
     * const routingDecision = await prisma.routingDecision.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RoutingDecisionCreateManyArgs>(args?: SelectSubset<T, RoutingDecisionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RoutingDecisions and returns the data saved in the database.
     * @param {RoutingDecisionCreateManyAndReturnArgs} args - Arguments to create many RoutingDecisions.
     * @example
     * // Create many RoutingDecisions
     * const routingDecision = await prisma.routingDecision.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RoutingDecisions and only return the `id`
     * const routingDecisionWithIdOnly = await prisma.routingDecision.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RoutingDecisionCreateManyAndReturnArgs>(args?: SelectSubset<T, RoutingDecisionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RoutingDecision.
     * @param {RoutingDecisionDeleteArgs} args - Arguments to delete one RoutingDecision.
     * @example
     * // Delete one RoutingDecision
     * const RoutingDecision = await prisma.routingDecision.delete({
     *   where: {
     *     // ... filter to delete one RoutingDecision
     *   }
     * })
     * 
     */
    delete<T extends RoutingDecisionDeleteArgs>(args: SelectSubset<T, RoutingDecisionDeleteArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RoutingDecision.
     * @param {RoutingDecisionUpdateArgs} args - Arguments to update one RoutingDecision.
     * @example
     * // Update one RoutingDecision
     * const routingDecision = await prisma.routingDecision.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RoutingDecisionUpdateArgs>(args: SelectSubset<T, RoutingDecisionUpdateArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RoutingDecisions.
     * @param {RoutingDecisionDeleteManyArgs} args - Arguments to filter RoutingDecisions to delete.
     * @example
     * // Delete a few RoutingDecisions
     * const { count } = await prisma.routingDecision.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RoutingDecisionDeleteManyArgs>(args?: SelectSubset<T, RoutingDecisionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RoutingDecisions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RoutingDecisions
     * const routingDecision = await prisma.routingDecision.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RoutingDecisionUpdateManyArgs>(args: SelectSubset<T, RoutingDecisionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RoutingDecision.
     * @param {RoutingDecisionUpsertArgs} args - Arguments to update or create a RoutingDecision.
     * @example
     * // Update or create a RoutingDecision
     * const routingDecision = await prisma.routingDecision.upsert({
     *   create: {
     *     // ... data to create a RoutingDecision
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RoutingDecision we want to update
     *   }
     * })
     */
    upsert<T extends RoutingDecisionUpsertArgs>(args: SelectSubset<T, RoutingDecisionUpsertArgs<ExtArgs>>): Prisma__RoutingDecisionClient<$Result.GetResult<Prisma.$RoutingDecisionPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RoutingDecisions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionCountArgs} args - Arguments to filter RoutingDecisions to count.
     * @example
     * // Count the number of RoutingDecisions
     * const count = await prisma.routingDecision.count({
     *   where: {
     *     // ... the filter for the RoutingDecisions we want to count
     *   }
     * })
    **/
    count<T extends RoutingDecisionCountArgs>(
      args?: Subset<T, RoutingDecisionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RoutingDecisionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RoutingDecision.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends RoutingDecisionAggregateArgs>(args: Subset<T, RoutingDecisionAggregateArgs>): Prisma.PrismaPromise<GetRoutingDecisionAggregateType<T>>

    /**
     * Group by RoutingDecision.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingDecisionGroupByArgs} args - Group by arguments.
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
      T extends RoutingDecisionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RoutingDecisionGroupByArgs['orderBy'] }
        : { orderBy?: RoutingDecisionGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, RoutingDecisionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRoutingDecisionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RoutingDecision model
   */
  readonly fields: RoutingDecisionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RoutingDecision.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RoutingDecisionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
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
   * Fields of the RoutingDecision model
   */ 
  interface RoutingDecisionFieldRefs {
    readonly id: FieldRef<"RoutingDecision", 'String'>
    readonly messageId: FieldRef<"RoutingDecision", 'String'>
    readonly threadId: FieldRef<"RoutingDecision", 'String'>
    readonly selectedProvider: FieldRef<"RoutingDecision", 'String'>
    readonly selectedModel: FieldRef<"RoutingDecision", 'String'>
    readonly routingMode: FieldRef<"RoutingDecision", 'RoutingMode'>
    readonly confidence: FieldRef<"RoutingDecision", 'Decimal'>
    readonly reasonTags: FieldRef<"RoutingDecision", 'String[]'>
    readonly privacyClass: FieldRef<"RoutingDecision", 'String'>
    readonly costClass: FieldRef<"RoutingDecision", 'String'>
    readonly fallbackProvider: FieldRef<"RoutingDecision", 'String'>
    readonly fallbackModel: FieldRef<"RoutingDecision", 'String'>
    readonly createdAt: FieldRef<"RoutingDecision", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RoutingDecision findUnique
   */
  export type RoutingDecisionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * Filter, which RoutingDecision to fetch.
     */
    where: RoutingDecisionWhereUniqueInput
  }

  /**
   * RoutingDecision findUniqueOrThrow
   */
  export type RoutingDecisionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * Filter, which RoutingDecision to fetch.
     */
    where: RoutingDecisionWhereUniqueInput
  }

  /**
   * RoutingDecision findFirst
   */
  export type RoutingDecisionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * Filter, which RoutingDecision to fetch.
     */
    where?: RoutingDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingDecisions to fetch.
     */
    orderBy?: RoutingDecisionOrderByWithRelationInput | RoutingDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RoutingDecisions.
     */
    cursor?: RoutingDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingDecisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RoutingDecisions.
     */
    distinct?: RoutingDecisionScalarFieldEnum | RoutingDecisionScalarFieldEnum[]
  }

  /**
   * RoutingDecision findFirstOrThrow
   */
  export type RoutingDecisionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * Filter, which RoutingDecision to fetch.
     */
    where?: RoutingDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingDecisions to fetch.
     */
    orderBy?: RoutingDecisionOrderByWithRelationInput | RoutingDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RoutingDecisions.
     */
    cursor?: RoutingDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingDecisions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RoutingDecisions.
     */
    distinct?: RoutingDecisionScalarFieldEnum | RoutingDecisionScalarFieldEnum[]
  }

  /**
   * RoutingDecision findMany
   */
  export type RoutingDecisionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * Filter, which RoutingDecisions to fetch.
     */
    where?: RoutingDecisionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingDecisions to fetch.
     */
    orderBy?: RoutingDecisionOrderByWithRelationInput | RoutingDecisionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RoutingDecisions.
     */
    cursor?: RoutingDecisionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingDecisions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingDecisions.
     */
    skip?: number
    distinct?: RoutingDecisionScalarFieldEnum | RoutingDecisionScalarFieldEnum[]
  }

  /**
   * RoutingDecision create
   */
  export type RoutingDecisionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * The data needed to create a RoutingDecision.
     */
    data: XOR<RoutingDecisionCreateInput, RoutingDecisionUncheckedCreateInput>
  }

  /**
   * RoutingDecision createMany
   */
  export type RoutingDecisionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RoutingDecisions.
     */
    data: RoutingDecisionCreateManyInput | RoutingDecisionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RoutingDecision createManyAndReturn
   */
  export type RoutingDecisionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RoutingDecisions.
     */
    data: RoutingDecisionCreateManyInput | RoutingDecisionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RoutingDecision update
   */
  export type RoutingDecisionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * The data needed to update a RoutingDecision.
     */
    data: XOR<RoutingDecisionUpdateInput, RoutingDecisionUncheckedUpdateInput>
    /**
     * Choose, which RoutingDecision to update.
     */
    where: RoutingDecisionWhereUniqueInput
  }

  /**
   * RoutingDecision updateMany
   */
  export type RoutingDecisionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RoutingDecisions.
     */
    data: XOR<RoutingDecisionUpdateManyMutationInput, RoutingDecisionUncheckedUpdateManyInput>
    /**
     * Filter which RoutingDecisions to update
     */
    where?: RoutingDecisionWhereInput
  }

  /**
   * RoutingDecision upsert
   */
  export type RoutingDecisionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * The filter to search for the RoutingDecision to update in case it exists.
     */
    where: RoutingDecisionWhereUniqueInput
    /**
     * In case the RoutingDecision found by the `where` argument doesn't exist, create a new RoutingDecision with this data.
     */
    create: XOR<RoutingDecisionCreateInput, RoutingDecisionUncheckedCreateInput>
    /**
     * In case the RoutingDecision was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RoutingDecisionUpdateInput, RoutingDecisionUncheckedUpdateInput>
  }

  /**
   * RoutingDecision delete
   */
  export type RoutingDecisionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
    /**
     * Filter which RoutingDecision to delete.
     */
    where: RoutingDecisionWhereUniqueInput
  }

  /**
   * RoutingDecision deleteMany
   */
  export type RoutingDecisionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RoutingDecisions to delete
     */
    where?: RoutingDecisionWhereInput
  }

  /**
   * RoutingDecision without action
   */
  export type RoutingDecisionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingDecision
     */
    select?: RoutingDecisionSelect<ExtArgs> | null
  }


  /**
   * Model RoutingPolicy
   */

  export type AggregateRoutingPolicy = {
    _count: RoutingPolicyCountAggregateOutputType | null
    _avg: RoutingPolicyAvgAggregateOutputType | null
    _sum: RoutingPolicySumAggregateOutputType | null
    _min: RoutingPolicyMinAggregateOutputType | null
    _max: RoutingPolicyMaxAggregateOutputType | null
  }

  export type RoutingPolicyAvgAggregateOutputType = {
    priority: number | null
  }

  export type RoutingPolicySumAggregateOutputType = {
    priority: number | null
  }

  export type RoutingPolicyMinAggregateOutputType = {
    id: string | null
    name: string | null
    routingMode: $Enums.RoutingMode | null
    priority: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RoutingPolicyMaxAggregateOutputType = {
    id: string | null
    name: string | null
    routingMode: $Enums.RoutingMode | null
    priority: number | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type RoutingPolicyCountAggregateOutputType = {
    id: number
    name: number
    routingMode: number
    priority: number
    isActive: number
    config: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type RoutingPolicyAvgAggregateInputType = {
    priority?: true
  }

  export type RoutingPolicySumAggregateInputType = {
    priority?: true
  }

  export type RoutingPolicyMinAggregateInputType = {
    id?: true
    name?: true
    routingMode?: true
    priority?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RoutingPolicyMaxAggregateInputType = {
    id?: true
    name?: true
    routingMode?: true
    priority?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type RoutingPolicyCountAggregateInputType = {
    id?: true
    name?: true
    routingMode?: true
    priority?: true
    isActive?: true
    config?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type RoutingPolicyAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RoutingPolicy to aggregate.
     */
    where?: RoutingPolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingPolicies to fetch.
     */
    orderBy?: RoutingPolicyOrderByWithRelationInput | RoutingPolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: RoutingPolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingPolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingPolicies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned RoutingPolicies
    **/
    _count?: true | RoutingPolicyCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: RoutingPolicyAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: RoutingPolicySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: RoutingPolicyMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: RoutingPolicyMaxAggregateInputType
  }

  export type GetRoutingPolicyAggregateType<T extends RoutingPolicyAggregateArgs> = {
        [P in keyof T & keyof AggregateRoutingPolicy]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateRoutingPolicy[P]>
      : GetScalarType<T[P], AggregateRoutingPolicy[P]>
  }




  export type RoutingPolicyGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: RoutingPolicyWhereInput
    orderBy?: RoutingPolicyOrderByWithAggregationInput | RoutingPolicyOrderByWithAggregationInput[]
    by: RoutingPolicyScalarFieldEnum[] | RoutingPolicyScalarFieldEnum
    having?: RoutingPolicyScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: RoutingPolicyCountAggregateInputType | true
    _avg?: RoutingPolicyAvgAggregateInputType
    _sum?: RoutingPolicySumAggregateInputType
    _min?: RoutingPolicyMinAggregateInputType
    _max?: RoutingPolicyMaxAggregateInputType
  }

  export type RoutingPolicyGroupByOutputType = {
    id: string
    name: string
    routingMode: $Enums.RoutingMode
    priority: number
    isActive: boolean
    config: JsonValue
    createdAt: Date
    updatedAt: Date
    _count: RoutingPolicyCountAggregateOutputType | null
    _avg: RoutingPolicyAvgAggregateOutputType | null
    _sum: RoutingPolicySumAggregateOutputType | null
    _min: RoutingPolicyMinAggregateOutputType | null
    _max: RoutingPolicyMaxAggregateOutputType | null
  }

  type GetRoutingPolicyGroupByPayload<T extends RoutingPolicyGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<RoutingPolicyGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof RoutingPolicyGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], RoutingPolicyGroupByOutputType[P]>
            : GetScalarType<T[P], RoutingPolicyGroupByOutputType[P]>
        }
      >
    >


  export type RoutingPolicySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    routingMode?: boolean
    priority?: boolean
    isActive?: boolean
    config?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["routingPolicy"]>

  export type RoutingPolicySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    routingMode?: boolean
    priority?: boolean
    isActive?: boolean
    config?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["routingPolicy"]>

  export type RoutingPolicySelectScalar = {
    id?: boolean
    name?: boolean
    routingMode?: boolean
    priority?: boolean
    isActive?: boolean
    config?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }


  export type $RoutingPolicyPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "RoutingPolicy"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      routingMode: $Enums.RoutingMode
      priority: number
      isActive: boolean
      config: Prisma.JsonValue
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["routingPolicy"]>
    composites: {}
  }

  type RoutingPolicyGetPayload<S extends boolean | null | undefined | RoutingPolicyDefaultArgs> = $Result.GetResult<Prisma.$RoutingPolicyPayload, S>

  type RoutingPolicyCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<RoutingPolicyFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: RoutingPolicyCountAggregateInputType | true
    }

  export interface RoutingPolicyDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['RoutingPolicy'], meta: { name: 'RoutingPolicy' } }
    /**
     * Find zero or one RoutingPolicy that matches the filter.
     * @param {RoutingPolicyFindUniqueArgs} args - Arguments to find a RoutingPolicy
     * @example
     * // Get one RoutingPolicy
     * const routingPolicy = await prisma.routingPolicy.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends RoutingPolicyFindUniqueArgs>(args: SelectSubset<T, RoutingPolicyFindUniqueArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one RoutingPolicy that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {RoutingPolicyFindUniqueOrThrowArgs} args - Arguments to find a RoutingPolicy
     * @example
     * // Get one RoutingPolicy
     * const routingPolicy = await prisma.routingPolicy.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends RoutingPolicyFindUniqueOrThrowArgs>(args: SelectSubset<T, RoutingPolicyFindUniqueOrThrowArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first RoutingPolicy that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyFindFirstArgs} args - Arguments to find a RoutingPolicy
     * @example
     * // Get one RoutingPolicy
     * const routingPolicy = await prisma.routingPolicy.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends RoutingPolicyFindFirstArgs>(args?: SelectSubset<T, RoutingPolicyFindFirstArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first RoutingPolicy that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyFindFirstOrThrowArgs} args - Arguments to find a RoutingPolicy
     * @example
     * // Get one RoutingPolicy
     * const routingPolicy = await prisma.routingPolicy.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends RoutingPolicyFindFirstOrThrowArgs>(args?: SelectSubset<T, RoutingPolicyFindFirstOrThrowArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more RoutingPolicies that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all RoutingPolicies
     * const routingPolicies = await prisma.routingPolicy.findMany()
     * 
     * // Get first 10 RoutingPolicies
     * const routingPolicies = await prisma.routingPolicy.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const routingPolicyWithIdOnly = await prisma.routingPolicy.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends RoutingPolicyFindManyArgs>(args?: SelectSubset<T, RoutingPolicyFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a RoutingPolicy.
     * @param {RoutingPolicyCreateArgs} args - Arguments to create a RoutingPolicy.
     * @example
     * // Create one RoutingPolicy
     * const RoutingPolicy = await prisma.routingPolicy.create({
     *   data: {
     *     // ... data to create a RoutingPolicy
     *   }
     * })
     * 
     */
    create<T extends RoutingPolicyCreateArgs>(args: SelectSubset<T, RoutingPolicyCreateArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many RoutingPolicies.
     * @param {RoutingPolicyCreateManyArgs} args - Arguments to create many RoutingPolicies.
     * @example
     * // Create many RoutingPolicies
     * const routingPolicy = await prisma.routingPolicy.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends RoutingPolicyCreateManyArgs>(args?: SelectSubset<T, RoutingPolicyCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many RoutingPolicies and returns the data saved in the database.
     * @param {RoutingPolicyCreateManyAndReturnArgs} args - Arguments to create many RoutingPolicies.
     * @example
     * // Create many RoutingPolicies
     * const routingPolicy = await prisma.routingPolicy.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many RoutingPolicies and only return the `id`
     * const routingPolicyWithIdOnly = await prisma.routingPolicy.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends RoutingPolicyCreateManyAndReturnArgs>(args?: SelectSubset<T, RoutingPolicyCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a RoutingPolicy.
     * @param {RoutingPolicyDeleteArgs} args - Arguments to delete one RoutingPolicy.
     * @example
     * // Delete one RoutingPolicy
     * const RoutingPolicy = await prisma.routingPolicy.delete({
     *   where: {
     *     // ... filter to delete one RoutingPolicy
     *   }
     * })
     * 
     */
    delete<T extends RoutingPolicyDeleteArgs>(args: SelectSubset<T, RoutingPolicyDeleteArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one RoutingPolicy.
     * @param {RoutingPolicyUpdateArgs} args - Arguments to update one RoutingPolicy.
     * @example
     * // Update one RoutingPolicy
     * const routingPolicy = await prisma.routingPolicy.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends RoutingPolicyUpdateArgs>(args: SelectSubset<T, RoutingPolicyUpdateArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more RoutingPolicies.
     * @param {RoutingPolicyDeleteManyArgs} args - Arguments to filter RoutingPolicies to delete.
     * @example
     * // Delete a few RoutingPolicies
     * const { count } = await prisma.routingPolicy.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends RoutingPolicyDeleteManyArgs>(args?: SelectSubset<T, RoutingPolicyDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more RoutingPolicies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many RoutingPolicies
     * const routingPolicy = await prisma.routingPolicy.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends RoutingPolicyUpdateManyArgs>(args: SelectSubset<T, RoutingPolicyUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one RoutingPolicy.
     * @param {RoutingPolicyUpsertArgs} args - Arguments to update or create a RoutingPolicy.
     * @example
     * // Update or create a RoutingPolicy
     * const routingPolicy = await prisma.routingPolicy.upsert({
     *   create: {
     *     // ... data to create a RoutingPolicy
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the RoutingPolicy we want to update
     *   }
     * })
     */
    upsert<T extends RoutingPolicyUpsertArgs>(args: SelectSubset<T, RoutingPolicyUpsertArgs<ExtArgs>>): Prisma__RoutingPolicyClient<$Result.GetResult<Prisma.$RoutingPolicyPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of RoutingPolicies.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyCountArgs} args - Arguments to filter RoutingPolicies to count.
     * @example
     * // Count the number of RoutingPolicies
     * const count = await prisma.routingPolicy.count({
     *   where: {
     *     // ... the filter for the RoutingPolicies we want to count
     *   }
     * })
    **/
    count<T extends RoutingPolicyCountArgs>(
      args?: Subset<T, RoutingPolicyCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], RoutingPolicyCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a RoutingPolicy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends RoutingPolicyAggregateArgs>(args: Subset<T, RoutingPolicyAggregateArgs>): Prisma.PrismaPromise<GetRoutingPolicyAggregateType<T>>

    /**
     * Group by RoutingPolicy.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {RoutingPolicyGroupByArgs} args - Group by arguments.
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
      T extends RoutingPolicyGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: RoutingPolicyGroupByArgs['orderBy'] }
        : { orderBy?: RoutingPolicyGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, RoutingPolicyGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetRoutingPolicyGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the RoutingPolicy model
   */
  readonly fields: RoutingPolicyFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for RoutingPolicy.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__RoutingPolicyClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
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
   * Fields of the RoutingPolicy model
   */ 
  interface RoutingPolicyFieldRefs {
    readonly id: FieldRef<"RoutingPolicy", 'String'>
    readonly name: FieldRef<"RoutingPolicy", 'String'>
    readonly routingMode: FieldRef<"RoutingPolicy", 'RoutingMode'>
    readonly priority: FieldRef<"RoutingPolicy", 'Int'>
    readonly isActive: FieldRef<"RoutingPolicy", 'Boolean'>
    readonly config: FieldRef<"RoutingPolicy", 'Json'>
    readonly createdAt: FieldRef<"RoutingPolicy", 'DateTime'>
    readonly updatedAt: FieldRef<"RoutingPolicy", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * RoutingPolicy findUnique
   */
  export type RoutingPolicyFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * Filter, which RoutingPolicy to fetch.
     */
    where: RoutingPolicyWhereUniqueInput
  }

  /**
   * RoutingPolicy findUniqueOrThrow
   */
  export type RoutingPolicyFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * Filter, which RoutingPolicy to fetch.
     */
    where: RoutingPolicyWhereUniqueInput
  }

  /**
   * RoutingPolicy findFirst
   */
  export type RoutingPolicyFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * Filter, which RoutingPolicy to fetch.
     */
    where?: RoutingPolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingPolicies to fetch.
     */
    orderBy?: RoutingPolicyOrderByWithRelationInput | RoutingPolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RoutingPolicies.
     */
    cursor?: RoutingPolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingPolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingPolicies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RoutingPolicies.
     */
    distinct?: RoutingPolicyScalarFieldEnum | RoutingPolicyScalarFieldEnum[]
  }

  /**
   * RoutingPolicy findFirstOrThrow
   */
  export type RoutingPolicyFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * Filter, which RoutingPolicy to fetch.
     */
    where?: RoutingPolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingPolicies to fetch.
     */
    orderBy?: RoutingPolicyOrderByWithRelationInput | RoutingPolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for RoutingPolicies.
     */
    cursor?: RoutingPolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingPolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingPolicies.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of RoutingPolicies.
     */
    distinct?: RoutingPolicyScalarFieldEnum | RoutingPolicyScalarFieldEnum[]
  }

  /**
   * RoutingPolicy findMany
   */
  export type RoutingPolicyFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * Filter, which RoutingPolicies to fetch.
     */
    where?: RoutingPolicyWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of RoutingPolicies to fetch.
     */
    orderBy?: RoutingPolicyOrderByWithRelationInput | RoutingPolicyOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing RoutingPolicies.
     */
    cursor?: RoutingPolicyWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` RoutingPolicies from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` RoutingPolicies.
     */
    skip?: number
    distinct?: RoutingPolicyScalarFieldEnum | RoutingPolicyScalarFieldEnum[]
  }

  /**
   * RoutingPolicy create
   */
  export type RoutingPolicyCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * The data needed to create a RoutingPolicy.
     */
    data: XOR<RoutingPolicyCreateInput, RoutingPolicyUncheckedCreateInput>
  }

  /**
   * RoutingPolicy createMany
   */
  export type RoutingPolicyCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many RoutingPolicies.
     */
    data: RoutingPolicyCreateManyInput | RoutingPolicyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RoutingPolicy createManyAndReturn
   */
  export type RoutingPolicyCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many RoutingPolicies.
     */
    data: RoutingPolicyCreateManyInput | RoutingPolicyCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * RoutingPolicy update
   */
  export type RoutingPolicyUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * The data needed to update a RoutingPolicy.
     */
    data: XOR<RoutingPolicyUpdateInput, RoutingPolicyUncheckedUpdateInput>
    /**
     * Choose, which RoutingPolicy to update.
     */
    where: RoutingPolicyWhereUniqueInput
  }

  /**
   * RoutingPolicy updateMany
   */
  export type RoutingPolicyUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update RoutingPolicies.
     */
    data: XOR<RoutingPolicyUpdateManyMutationInput, RoutingPolicyUncheckedUpdateManyInput>
    /**
     * Filter which RoutingPolicies to update
     */
    where?: RoutingPolicyWhereInput
  }

  /**
   * RoutingPolicy upsert
   */
  export type RoutingPolicyUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * The filter to search for the RoutingPolicy to update in case it exists.
     */
    where: RoutingPolicyWhereUniqueInput
    /**
     * In case the RoutingPolicy found by the `where` argument doesn't exist, create a new RoutingPolicy with this data.
     */
    create: XOR<RoutingPolicyCreateInput, RoutingPolicyUncheckedCreateInput>
    /**
     * In case the RoutingPolicy was found with the provided `where` argument, update it with this data.
     */
    update: XOR<RoutingPolicyUpdateInput, RoutingPolicyUncheckedUpdateInput>
  }

  /**
   * RoutingPolicy delete
   */
  export type RoutingPolicyDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
    /**
     * Filter which RoutingPolicy to delete.
     */
    where: RoutingPolicyWhereUniqueInput
  }

  /**
   * RoutingPolicy deleteMany
   */
  export type RoutingPolicyDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which RoutingPolicies to delete
     */
    where?: RoutingPolicyWhereInput
  }

  /**
   * RoutingPolicy without action
   */
  export type RoutingPolicyDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the RoutingPolicy
     */
    select?: RoutingPolicySelect<ExtArgs> | null
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


  export const RoutingDecisionScalarFieldEnum: {
    id: 'id',
    messageId: 'messageId',
    threadId: 'threadId',
    selectedProvider: 'selectedProvider',
    selectedModel: 'selectedModel',
    routingMode: 'routingMode',
    confidence: 'confidence',
    reasonTags: 'reasonTags',
    privacyClass: 'privacyClass',
    costClass: 'costClass',
    fallbackProvider: 'fallbackProvider',
    fallbackModel: 'fallbackModel',
    createdAt: 'createdAt'
  };

  export type RoutingDecisionScalarFieldEnum = (typeof RoutingDecisionScalarFieldEnum)[keyof typeof RoutingDecisionScalarFieldEnum]


  export const RoutingPolicyScalarFieldEnum: {
    id: 'id',
    name: 'name',
    routingMode: 'routingMode',
    priority: 'priority',
    isActive: 'isActive',
    config: 'config',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type RoutingPolicyScalarFieldEnum = (typeof RoutingPolicyScalarFieldEnum)[keyof typeof RoutingPolicyScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


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


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


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
   * Reference to a field of type 'RoutingMode'
   */
  export type EnumRoutingModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RoutingMode'>
    


  /**
   * Reference to a field of type 'RoutingMode[]'
   */
  export type ListEnumRoutingModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RoutingMode[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


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
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


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


  export type RoutingDecisionWhereInput = {
    AND?: RoutingDecisionWhereInput | RoutingDecisionWhereInput[]
    OR?: RoutingDecisionWhereInput[]
    NOT?: RoutingDecisionWhereInput | RoutingDecisionWhereInput[]
    id?: StringFilter<"RoutingDecision"> | string
    messageId?: StringNullableFilter<"RoutingDecision"> | string | null
    threadId?: StringFilter<"RoutingDecision"> | string
    selectedProvider?: StringFilter<"RoutingDecision"> | string
    selectedModel?: StringFilter<"RoutingDecision"> | string
    routingMode?: EnumRoutingModeFilter<"RoutingDecision"> | $Enums.RoutingMode
    confidence?: DecimalNullableFilter<"RoutingDecision"> | Decimal | DecimalJsLike | number | string | null
    reasonTags?: StringNullableListFilter<"RoutingDecision">
    privacyClass?: StringNullableFilter<"RoutingDecision"> | string | null
    costClass?: StringNullableFilter<"RoutingDecision"> | string | null
    fallbackProvider?: StringNullableFilter<"RoutingDecision"> | string | null
    fallbackModel?: StringNullableFilter<"RoutingDecision"> | string | null
    createdAt?: DateTimeFilter<"RoutingDecision"> | Date | string
  }

  export type RoutingDecisionOrderByWithRelationInput = {
    id?: SortOrder
    messageId?: SortOrderInput | SortOrder
    threadId?: SortOrder
    selectedProvider?: SortOrder
    selectedModel?: SortOrder
    routingMode?: SortOrder
    confidence?: SortOrderInput | SortOrder
    reasonTags?: SortOrder
    privacyClass?: SortOrderInput | SortOrder
    costClass?: SortOrderInput | SortOrder
    fallbackProvider?: SortOrderInput | SortOrder
    fallbackModel?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type RoutingDecisionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RoutingDecisionWhereInput | RoutingDecisionWhereInput[]
    OR?: RoutingDecisionWhereInput[]
    NOT?: RoutingDecisionWhereInput | RoutingDecisionWhereInput[]
    messageId?: StringNullableFilter<"RoutingDecision"> | string | null
    threadId?: StringFilter<"RoutingDecision"> | string
    selectedProvider?: StringFilter<"RoutingDecision"> | string
    selectedModel?: StringFilter<"RoutingDecision"> | string
    routingMode?: EnumRoutingModeFilter<"RoutingDecision"> | $Enums.RoutingMode
    confidence?: DecimalNullableFilter<"RoutingDecision"> | Decimal | DecimalJsLike | number | string | null
    reasonTags?: StringNullableListFilter<"RoutingDecision">
    privacyClass?: StringNullableFilter<"RoutingDecision"> | string | null
    costClass?: StringNullableFilter<"RoutingDecision"> | string | null
    fallbackProvider?: StringNullableFilter<"RoutingDecision"> | string | null
    fallbackModel?: StringNullableFilter<"RoutingDecision"> | string | null
    createdAt?: DateTimeFilter<"RoutingDecision"> | Date | string
  }, "id">

  export type RoutingDecisionOrderByWithAggregationInput = {
    id?: SortOrder
    messageId?: SortOrderInput | SortOrder
    threadId?: SortOrder
    selectedProvider?: SortOrder
    selectedModel?: SortOrder
    routingMode?: SortOrder
    confidence?: SortOrderInput | SortOrder
    reasonTags?: SortOrder
    privacyClass?: SortOrderInput | SortOrder
    costClass?: SortOrderInput | SortOrder
    fallbackProvider?: SortOrderInput | SortOrder
    fallbackModel?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: RoutingDecisionCountOrderByAggregateInput
    _avg?: RoutingDecisionAvgOrderByAggregateInput
    _max?: RoutingDecisionMaxOrderByAggregateInput
    _min?: RoutingDecisionMinOrderByAggregateInput
    _sum?: RoutingDecisionSumOrderByAggregateInput
  }

  export type RoutingDecisionScalarWhereWithAggregatesInput = {
    AND?: RoutingDecisionScalarWhereWithAggregatesInput | RoutingDecisionScalarWhereWithAggregatesInput[]
    OR?: RoutingDecisionScalarWhereWithAggregatesInput[]
    NOT?: RoutingDecisionScalarWhereWithAggregatesInput | RoutingDecisionScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RoutingDecision"> | string
    messageId?: StringNullableWithAggregatesFilter<"RoutingDecision"> | string | null
    threadId?: StringWithAggregatesFilter<"RoutingDecision"> | string
    selectedProvider?: StringWithAggregatesFilter<"RoutingDecision"> | string
    selectedModel?: StringWithAggregatesFilter<"RoutingDecision"> | string
    routingMode?: EnumRoutingModeWithAggregatesFilter<"RoutingDecision"> | $Enums.RoutingMode
    confidence?: DecimalNullableWithAggregatesFilter<"RoutingDecision"> | Decimal | DecimalJsLike | number | string | null
    reasonTags?: StringNullableListFilter<"RoutingDecision">
    privacyClass?: StringNullableWithAggregatesFilter<"RoutingDecision"> | string | null
    costClass?: StringNullableWithAggregatesFilter<"RoutingDecision"> | string | null
    fallbackProvider?: StringNullableWithAggregatesFilter<"RoutingDecision"> | string | null
    fallbackModel?: StringNullableWithAggregatesFilter<"RoutingDecision"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"RoutingDecision"> | Date | string
  }

  export type RoutingPolicyWhereInput = {
    AND?: RoutingPolicyWhereInput | RoutingPolicyWhereInput[]
    OR?: RoutingPolicyWhereInput[]
    NOT?: RoutingPolicyWhereInput | RoutingPolicyWhereInput[]
    id?: StringFilter<"RoutingPolicy"> | string
    name?: StringFilter<"RoutingPolicy"> | string
    routingMode?: EnumRoutingModeFilter<"RoutingPolicy"> | $Enums.RoutingMode
    priority?: IntFilter<"RoutingPolicy"> | number
    isActive?: BoolFilter<"RoutingPolicy"> | boolean
    config?: JsonFilter<"RoutingPolicy">
    createdAt?: DateTimeFilter<"RoutingPolicy"> | Date | string
    updatedAt?: DateTimeFilter<"RoutingPolicy"> | Date | string
  }

  export type RoutingPolicyOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    routingMode?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    config?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoutingPolicyWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: RoutingPolicyWhereInput | RoutingPolicyWhereInput[]
    OR?: RoutingPolicyWhereInput[]
    NOT?: RoutingPolicyWhereInput | RoutingPolicyWhereInput[]
    name?: StringFilter<"RoutingPolicy"> | string
    routingMode?: EnumRoutingModeFilter<"RoutingPolicy"> | $Enums.RoutingMode
    priority?: IntFilter<"RoutingPolicy"> | number
    isActive?: BoolFilter<"RoutingPolicy"> | boolean
    config?: JsonFilter<"RoutingPolicy">
    createdAt?: DateTimeFilter<"RoutingPolicy"> | Date | string
    updatedAt?: DateTimeFilter<"RoutingPolicy"> | Date | string
  }, "id">

  export type RoutingPolicyOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    routingMode?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    config?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: RoutingPolicyCountOrderByAggregateInput
    _avg?: RoutingPolicyAvgOrderByAggregateInput
    _max?: RoutingPolicyMaxOrderByAggregateInput
    _min?: RoutingPolicyMinOrderByAggregateInput
    _sum?: RoutingPolicySumOrderByAggregateInput
  }

  export type RoutingPolicyScalarWhereWithAggregatesInput = {
    AND?: RoutingPolicyScalarWhereWithAggregatesInput | RoutingPolicyScalarWhereWithAggregatesInput[]
    OR?: RoutingPolicyScalarWhereWithAggregatesInput[]
    NOT?: RoutingPolicyScalarWhereWithAggregatesInput | RoutingPolicyScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"RoutingPolicy"> | string
    name?: StringWithAggregatesFilter<"RoutingPolicy"> | string
    routingMode?: EnumRoutingModeWithAggregatesFilter<"RoutingPolicy"> | $Enums.RoutingMode
    priority?: IntWithAggregatesFilter<"RoutingPolicy"> | number
    isActive?: BoolWithAggregatesFilter<"RoutingPolicy"> | boolean
    config?: JsonWithAggregatesFilter<"RoutingPolicy">
    createdAt?: DateTimeWithAggregatesFilter<"RoutingPolicy"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"RoutingPolicy"> | Date | string
  }

  export type RoutingDecisionCreateInput = {
    id?: string
    messageId?: string | null
    threadId: string
    selectedProvider: string
    selectedModel: string
    routingMode: $Enums.RoutingMode
    confidence?: Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionCreatereasonTagsInput | string[]
    privacyClass?: string | null
    costClass?: string | null
    fallbackProvider?: string | null
    fallbackModel?: string | null
    createdAt?: Date | string
  }

  export type RoutingDecisionUncheckedCreateInput = {
    id?: string
    messageId?: string | null
    threadId: string
    selectedProvider: string
    selectedModel: string
    routingMode: $Enums.RoutingMode
    confidence?: Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionCreatereasonTagsInput | string[]
    privacyClass?: string | null
    costClass?: string | null
    fallbackProvider?: string | null
    fallbackModel?: string | null
    createdAt?: Date | string
  }

  export type RoutingDecisionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: NullableStringFieldUpdateOperationsInput | string | null
    threadId?: StringFieldUpdateOperationsInput | string
    selectedProvider?: StringFieldUpdateOperationsInput | string
    selectedModel?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    confidence?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionUpdatereasonTagsInput | string[]
    privacyClass?: NullableStringFieldUpdateOperationsInput | string | null
    costClass?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackProvider?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackModel?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingDecisionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: NullableStringFieldUpdateOperationsInput | string | null
    threadId?: StringFieldUpdateOperationsInput | string
    selectedProvider?: StringFieldUpdateOperationsInput | string
    selectedModel?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    confidence?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionUpdatereasonTagsInput | string[]
    privacyClass?: NullableStringFieldUpdateOperationsInput | string | null
    costClass?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackProvider?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackModel?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingDecisionCreateManyInput = {
    id?: string
    messageId?: string | null
    threadId: string
    selectedProvider: string
    selectedModel: string
    routingMode: $Enums.RoutingMode
    confidence?: Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionCreatereasonTagsInput | string[]
    privacyClass?: string | null
    costClass?: string | null
    fallbackProvider?: string | null
    fallbackModel?: string | null
    createdAt?: Date | string
  }

  export type RoutingDecisionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: NullableStringFieldUpdateOperationsInput | string | null
    threadId?: StringFieldUpdateOperationsInput | string
    selectedProvider?: StringFieldUpdateOperationsInput | string
    selectedModel?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    confidence?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionUpdatereasonTagsInput | string[]
    privacyClass?: NullableStringFieldUpdateOperationsInput | string | null
    costClass?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackProvider?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackModel?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingDecisionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: NullableStringFieldUpdateOperationsInput | string | null
    threadId?: StringFieldUpdateOperationsInput | string
    selectedProvider?: StringFieldUpdateOperationsInput | string
    selectedModel?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    confidence?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    reasonTags?: RoutingDecisionUpdatereasonTagsInput | string[]
    privacyClass?: NullableStringFieldUpdateOperationsInput | string | null
    costClass?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackProvider?: NullableStringFieldUpdateOperationsInput | string | null
    fallbackModel?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingPolicyCreateInput = {
    id?: string
    name: string
    routingMode: $Enums.RoutingMode
    priority?: number
    isActive?: boolean
    config: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RoutingPolicyUncheckedCreateInput = {
    id?: string
    name: string
    routingMode: $Enums.RoutingMode
    priority?: number
    isActive?: boolean
    config: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RoutingPolicyUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    config?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingPolicyUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    config?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingPolicyCreateManyInput = {
    id?: string
    name: string
    routingMode: $Enums.RoutingMode
    priority?: number
    isActive?: boolean
    config: JsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type RoutingPolicyUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    config?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type RoutingPolicyUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    priority?: IntFieldUpdateOperationsInput | number
    isActive?: BoolFieldUpdateOperationsInput | boolean
    config?: JsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
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

  export type EnumRoutingModeFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel>
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRoutingModeFilter<$PrismaModel> | $Enums.RoutingMode
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
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

  export type RoutingDecisionCountOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    threadId?: SortOrder
    selectedProvider?: SortOrder
    selectedModel?: SortOrder
    routingMode?: SortOrder
    confidence?: SortOrder
    reasonTags?: SortOrder
    privacyClass?: SortOrder
    costClass?: SortOrder
    fallbackProvider?: SortOrder
    fallbackModel?: SortOrder
    createdAt?: SortOrder
  }

  export type RoutingDecisionAvgOrderByAggregateInput = {
    confidence?: SortOrder
  }

  export type RoutingDecisionMaxOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    threadId?: SortOrder
    selectedProvider?: SortOrder
    selectedModel?: SortOrder
    routingMode?: SortOrder
    confidence?: SortOrder
    privacyClass?: SortOrder
    costClass?: SortOrder
    fallbackProvider?: SortOrder
    fallbackModel?: SortOrder
    createdAt?: SortOrder
  }

  export type RoutingDecisionMinOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    threadId?: SortOrder
    selectedProvider?: SortOrder
    selectedModel?: SortOrder
    routingMode?: SortOrder
    confidence?: SortOrder
    privacyClass?: SortOrder
    costClass?: SortOrder
    fallbackProvider?: SortOrder
    fallbackModel?: SortOrder
    createdAt?: SortOrder
  }

  export type RoutingDecisionSumOrderByAggregateInput = {
    confidence?: SortOrder
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

  export type EnumRoutingModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel>
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRoutingModeWithAggregatesFilter<$PrismaModel> | $Enums.RoutingMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoutingModeFilter<$PrismaModel>
    _max?: NestedEnumRoutingModeFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
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

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type RoutingPolicyCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    routingMode?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    config?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoutingPolicyAvgOrderByAggregateInput = {
    priority?: SortOrder
  }

  export type RoutingPolicyMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    routingMode?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoutingPolicyMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    routingMode?: SortOrder
    priority?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type RoutingPolicySumOrderByAggregateInput = {
    priority?: SortOrder
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

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type RoutingDecisionCreatereasonTagsInput = {
    set: string[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumRoutingModeFieldUpdateOperationsInput = {
    set?: $Enums.RoutingMode
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type RoutingDecisionUpdatereasonTagsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
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

  export type NestedEnumRoutingModeFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel>
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRoutingModeFilter<$PrismaModel> | $Enums.RoutingMode
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
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

  export type NestedEnumRoutingModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel>
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel>
    not?: NestedEnumRoutingModeWithAggregatesFilter<$PrismaModel> | $Enums.RoutingMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoutingModeFilter<$PrismaModel>
    _max?: NestedEnumRoutingModeFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
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

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
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

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use RoutingDecisionDefaultArgs instead
     */
    export type RoutingDecisionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RoutingDecisionDefaultArgs<ExtArgs>
    /**
     * @deprecated Use RoutingPolicyDefaultArgs instead
     */
    export type RoutingPolicyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = RoutingPolicyDefaultArgs<ExtArgs>

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