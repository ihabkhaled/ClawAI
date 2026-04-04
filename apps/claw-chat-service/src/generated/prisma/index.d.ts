
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
 * Model ChatThread
 * 
 */
export type ChatThread = $Result.DefaultSelection<Prisma.$ChatThreadPayload>
/**
 * Model ChatMessage
 * 
 */
export type ChatMessage = $Result.DefaultSelection<Prisma.$ChatMessagePayload>
/**
 * Model MessageAttachment
 * 
 */
export type MessageAttachment = $Result.DefaultSelection<Prisma.$MessageAttachmentPayload>

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


export const MessageRole: {
  SYSTEM: 'SYSTEM',
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  TOOL: 'TOOL'
};

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole]

}

export type RoutingMode = $Enums.RoutingMode

export const RoutingMode: typeof $Enums.RoutingMode

export type MessageRole = $Enums.MessageRole

export const MessageRole: typeof $Enums.MessageRole

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more ChatThreads
 * const chatThreads = await prisma.chatThread.findMany()
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
   * // Fetch zero or more ChatThreads
   * const chatThreads = await prisma.chatThread.findMany()
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
   * `prisma.chatThread`: Exposes CRUD operations for the **ChatThread** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ChatThreads
    * const chatThreads = await prisma.chatThread.findMany()
    * ```
    */
  get chatThread(): Prisma.ChatThreadDelegate<ExtArgs>;

  /**
   * `prisma.chatMessage`: Exposes CRUD operations for the **ChatMessage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ChatMessages
    * const chatMessages = await prisma.chatMessage.findMany()
    * ```
    */
  get chatMessage(): Prisma.ChatMessageDelegate<ExtArgs>;

  /**
   * `prisma.messageAttachment`: Exposes CRUD operations for the **MessageAttachment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more MessageAttachments
    * const messageAttachments = await prisma.messageAttachment.findMany()
    * ```
    */
  get messageAttachment(): Prisma.MessageAttachmentDelegate<ExtArgs>;
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
    ChatThread: 'ChatThread',
    ChatMessage: 'ChatMessage',
    MessageAttachment: 'MessageAttachment'
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
      modelProps: "chatThread" | "chatMessage" | "messageAttachment"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      ChatThread: {
        payload: Prisma.$ChatThreadPayload<ExtArgs>
        fields: Prisma.ChatThreadFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ChatThreadFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ChatThreadFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>
          }
          findFirst: {
            args: Prisma.ChatThreadFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ChatThreadFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>
          }
          findMany: {
            args: Prisma.ChatThreadFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>[]
          }
          create: {
            args: Prisma.ChatThreadCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>
          }
          createMany: {
            args: Prisma.ChatThreadCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ChatThreadCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>[]
          }
          delete: {
            args: Prisma.ChatThreadDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>
          }
          update: {
            args: Prisma.ChatThreadUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>
          }
          deleteMany: {
            args: Prisma.ChatThreadDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ChatThreadUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ChatThreadUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatThreadPayload>
          }
          aggregate: {
            args: Prisma.ChatThreadAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateChatThread>
          }
          groupBy: {
            args: Prisma.ChatThreadGroupByArgs<ExtArgs>
            result: $Utils.Optional<ChatThreadGroupByOutputType>[]
          }
          count: {
            args: Prisma.ChatThreadCountArgs<ExtArgs>
            result: $Utils.Optional<ChatThreadCountAggregateOutputType> | number
          }
        }
      }
      ChatMessage: {
        payload: Prisma.$ChatMessagePayload<ExtArgs>
        fields: Prisma.ChatMessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ChatMessageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ChatMessageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>
          }
          findFirst: {
            args: Prisma.ChatMessageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ChatMessageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>
          }
          findMany: {
            args: Prisma.ChatMessageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>[]
          }
          create: {
            args: Prisma.ChatMessageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>
          }
          createMany: {
            args: Prisma.ChatMessageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ChatMessageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>[]
          }
          delete: {
            args: Prisma.ChatMessageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>
          }
          update: {
            args: Prisma.ChatMessageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>
          }
          deleteMany: {
            args: Prisma.ChatMessageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ChatMessageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ChatMessageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChatMessagePayload>
          }
          aggregate: {
            args: Prisma.ChatMessageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateChatMessage>
          }
          groupBy: {
            args: Prisma.ChatMessageGroupByArgs<ExtArgs>
            result: $Utils.Optional<ChatMessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.ChatMessageCountArgs<ExtArgs>
            result: $Utils.Optional<ChatMessageCountAggregateOutputType> | number
          }
        }
      }
      MessageAttachment: {
        payload: Prisma.$MessageAttachmentPayload<ExtArgs>
        fields: Prisma.MessageAttachmentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MessageAttachmentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MessageAttachmentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>
          }
          findFirst: {
            args: Prisma.MessageAttachmentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MessageAttachmentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>
          }
          findMany: {
            args: Prisma.MessageAttachmentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>[]
          }
          create: {
            args: Prisma.MessageAttachmentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>
          }
          createMany: {
            args: Prisma.MessageAttachmentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.MessageAttachmentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>[]
          }
          delete: {
            args: Prisma.MessageAttachmentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>
          }
          update: {
            args: Prisma.MessageAttachmentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>
          }
          deleteMany: {
            args: Prisma.MessageAttachmentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.MessageAttachmentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.MessageAttachmentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$MessageAttachmentPayload>
          }
          aggregate: {
            args: Prisma.MessageAttachmentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMessageAttachment>
          }
          groupBy: {
            args: Prisma.MessageAttachmentGroupByArgs<ExtArgs>
            result: $Utils.Optional<MessageAttachmentGroupByOutputType>[]
          }
          count: {
            args: Prisma.MessageAttachmentCountArgs<ExtArgs>
            result: $Utils.Optional<MessageAttachmentCountAggregateOutputType> | number
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
   * Count Type ChatThreadCountOutputType
   */

  export type ChatThreadCountOutputType = {
    messages: number
  }

  export type ChatThreadCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | ChatThreadCountOutputTypeCountMessagesArgs
  }

  // Custom InputTypes
  /**
   * ChatThreadCountOutputType without action
   */
  export type ChatThreadCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThreadCountOutputType
     */
    select?: ChatThreadCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ChatThreadCountOutputType without action
   */
  export type ChatThreadCountOutputTypeCountMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ChatMessageWhereInput
  }


  /**
   * Count Type ChatMessageCountOutputType
   */

  export type ChatMessageCountOutputType = {
    attachments: number
  }

  export type ChatMessageCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    attachments?: boolean | ChatMessageCountOutputTypeCountAttachmentsArgs
  }

  // Custom InputTypes
  /**
   * ChatMessageCountOutputType without action
   */
  export type ChatMessageCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessageCountOutputType
     */
    select?: ChatMessageCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ChatMessageCountOutputType without action
   */
  export type ChatMessageCountOutputTypeCountAttachmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageAttachmentWhereInput
  }


  /**
   * Models
   */

  /**
   * Model ChatThread
   */

  export type AggregateChatThread = {
    _count: ChatThreadCountAggregateOutputType | null
    _min: ChatThreadMinAggregateOutputType | null
    _max: ChatThreadMaxAggregateOutputType | null
  }

  export type ChatThreadMinAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    routingMode: $Enums.RoutingMode | null
    lastProvider: string | null
    lastModel: string | null
    isPinned: boolean | null
    isArchived: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ChatThreadMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    title: string | null
    routingMode: $Enums.RoutingMode | null
    lastProvider: string | null
    lastModel: string | null
    isPinned: boolean | null
    isArchived: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ChatThreadCountAggregateOutputType = {
    id: number
    userId: number
    title: number
    routingMode: number
    lastProvider: number
    lastModel: number
    isPinned: number
    isArchived: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ChatThreadMinAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    routingMode?: true
    lastProvider?: true
    lastModel?: true
    isPinned?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ChatThreadMaxAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    routingMode?: true
    lastProvider?: true
    lastModel?: true
    isPinned?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ChatThreadCountAggregateInputType = {
    id?: true
    userId?: true
    title?: true
    routingMode?: true
    lastProvider?: true
    lastModel?: true
    isPinned?: true
    isArchived?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ChatThreadAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ChatThread to aggregate.
     */
    where?: ChatThreadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatThreads to fetch.
     */
    orderBy?: ChatThreadOrderByWithRelationInput | ChatThreadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ChatThreadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatThreads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatThreads.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ChatThreads
    **/
    _count?: true | ChatThreadCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ChatThreadMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ChatThreadMaxAggregateInputType
  }

  export type GetChatThreadAggregateType<T extends ChatThreadAggregateArgs> = {
        [P in keyof T & keyof AggregateChatThread]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateChatThread[P]>
      : GetScalarType<T[P], AggregateChatThread[P]>
  }




  export type ChatThreadGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ChatThreadWhereInput
    orderBy?: ChatThreadOrderByWithAggregationInput | ChatThreadOrderByWithAggregationInput[]
    by: ChatThreadScalarFieldEnum[] | ChatThreadScalarFieldEnum
    having?: ChatThreadScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ChatThreadCountAggregateInputType | true
    _min?: ChatThreadMinAggregateInputType
    _max?: ChatThreadMaxAggregateInputType
  }

  export type ChatThreadGroupByOutputType = {
    id: string
    userId: string
    title: string | null
    routingMode: $Enums.RoutingMode
    lastProvider: string | null
    lastModel: string | null
    isPinned: boolean
    isArchived: boolean
    createdAt: Date
    updatedAt: Date
    _count: ChatThreadCountAggregateOutputType | null
    _min: ChatThreadMinAggregateOutputType | null
    _max: ChatThreadMaxAggregateOutputType | null
  }

  type GetChatThreadGroupByPayload<T extends ChatThreadGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ChatThreadGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ChatThreadGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ChatThreadGroupByOutputType[P]>
            : GetScalarType<T[P], ChatThreadGroupByOutputType[P]>
        }
      >
    >


  export type ChatThreadSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    routingMode?: boolean
    lastProvider?: boolean
    lastModel?: boolean
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    messages?: boolean | ChatThread$messagesArgs<ExtArgs>
    _count?: boolean | ChatThreadCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chatThread"]>

  export type ChatThreadSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    title?: boolean
    routingMode?: boolean
    lastProvider?: boolean
    lastModel?: boolean
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["chatThread"]>

  export type ChatThreadSelectScalar = {
    id?: boolean
    userId?: boolean
    title?: boolean
    routingMode?: boolean
    lastProvider?: boolean
    lastModel?: boolean
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ChatThreadInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | ChatThread$messagesArgs<ExtArgs>
    _count?: boolean | ChatThreadCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ChatThreadIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ChatThreadPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ChatThread"
    objects: {
      messages: Prisma.$ChatMessagePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      title: string | null
      routingMode: $Enums.RoutingMode
      lastProvider: string | null
      lastModel: string | null
      isPinned: boolean
      isArchived: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["chatThread"]>
    composites: {}
  }

  type ChatThreadGetPayload<S extends boolean | null | undefined | ChatThreadDefaultArgs> = $Result.GetResult<Prisma.$ChatThreadPayload, S>

  type ChatThreadCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ChatThreadFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ChatThreadCountAggregateInputType | true
    }

  export interface ChatThreadDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ChatThread'], meta: { name: 'ChatThread' } }
    /**
     * Find zero or one ChatThread that matches the filter.
     * @param {ChatThreadFindUniqueArgs} args - Arguments to find a ChatThread
     * @example
     * // Get one ChatThread
     * const chatThread = await prisma.chatThread.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ChatThreadFindUniqueArgs>(args: SelectSubset<T, ChatThreadFindUniqueArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ChatThread that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ChatThreadFindUniqueOrThrowArgs} args - Arguments to find a ChatThread
     * @example
     * // Get one ChatThread
     * const chatThread = await prisma.chatThread.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ChatThreadFindUniqueOrThrowArgs>(args: SelectSubset<T, ChatThreadFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ChatThread that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadFindFirstArgs} args - Arguments to find a ChatThread
     * @example
     * // Get one ChatThread
     * const chatThread = await prisma.chatThread.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ChatThreadFindFirstArgs>(args?: SelectSubset<T, ChatThreadFindFirstArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ChatThread that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadFindFirstOrThrowArgs} args - Arguments to find a ChatThread
     * @example
     * // Get one ChatThread
     * const chatThread = await prisma.chatThread.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ChatThreadFindFirstOrThrowArgs>(args?: SelectSubset<T, ChatThreadFindFirstOrThrowArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ChatThreads that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ChatThreads
     * const chatThreads = await prisma.chatThread.findMany()
     * 
     * // Get first 10 ChatThreads
     * const chatThreads = await prisma.chatThread.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const chatThreadWithIdOnly = await prisma.chatThread.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ChatThreadFindManyArgs>(args?: SelectSubset<T, ChatThreadFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ChatThread.
     * @param {ChatThreadCreateArgs} args - Arguments to create a ChatThread.
     * @example
     * // Create one ChatThread
     * const ChatThread = await prisma.chatThread.create({
     *   data: {
     *     // ... data to create a ChatThread
     *   }
     * })
     * 
     */
    create<T extends ChatThreadCreateArgs>(args: SelectSubset<T, ChatThreadCreateArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ChatThreads.
     * @param {ChatThreadCreateManyArgs} args - Arguments to create many ChatThreads.
     * @example
     * // Create many ChatThreads
     * const chatThread = await prisma.chatThread.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ChatThreadCreateManyArgs>(args?: SelectSubset<T, ChatThreadCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ChatThreads and returns the data saved in the database.
     * @param {ChatThreadCreateManyAndReturnArgs} args - Arguments to create many ChatThreads.
     * @example
     * // Create many ChatThreads
     * const chatThread = await prisma.chatThread.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ChatThreads and only return the `id`
     * const chatThreadWithIdOnly = await prisma.chatThread.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ChatThreadCreateManyAndReturnArgs>(args?: SelectSubset<T, ChatThreadCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ChatThread.
     * @param {ChatThreadDeleteArgs} args - Arguments to delete one ChatThread.
     * @example
     * // Delete one ChatThread
     * const ChatThread = await prisma.chatThread.delete({
     *   where: {
     *     // ... filter to delete one ChatThread
     *   }
     * })
     * 
     */
    delete<T extends ChatThreadDeleteArgs>(args: SelectSubset<T, ChatThreadDeleteArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ChatThread.
     * @param {ChatThreadUpdateArgs} args - Arguments to update one ChatThread.
     * @example
     * // Update one ChatThread
     * const chatThread = await prisma.chatThread.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ChatThreadUpdateArgs>(args: SelectSubset<T, ChatThreadUpdateArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ChatThreads.
     * @param {ChatThreadDeleteManyArgs} args - Arguments to filter ChatThreads to delete.
     * @example
     * // Delete a few ChatThreads
     * const { count } = await prisma.chatThread.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ChatThreadDeleteManyArgs>(args?: SelectSubset<T, ChatThreadDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ChatThreads.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ChatThreads
     * const chatThread = await prisma.chatThread.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ChatThreadUpdateManyArgs>(args: SelectSubset<T, ChatThreadUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ChatThread.
     * @param {ChatThreadUpsertArgs} args - Arguments to update or create a ChatThread.
     * @example
     * // Update or create a ChatThread
     * const chatThread = await prisma.chatThread.upsert({
     *   create: {
     *     // ... data to create a ChatThread
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ChatThread we want to update
     *   }
     * })
     */
    upsert<T extends ChatThreadUpsertArgs>(args: SelectSubset<T, ChatThreadUpsertArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ChatThreads.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadCountArgs} args - Arguments to filter ChatThreads to count.
     * @example
     * // Count the number of ChatThreads
     * const count = await prisma.chatThread.count({
     *   where: {
     *     // ... the filter for the ChatThreads we want to count
     *   }
     * })
    **/
    count<T extends ChatThreadCountArgs>(
      args?: Subset<T, ChatThreadCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ChatThreadCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ChatThread.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ChatThreadAggregateArgs>(args: Subset<T, ChatThreadAggregateArgs>): Prisma.PrismaPromise<GetChatThreadAggregateType<T>>

    /**
     * Group by ChatThread.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatThreadGroupByArgs} args - Group by arguments.
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
      T extends ChatThreadGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ChatThreadGroupByArgs['orderBy'] }
        : { orderBy?: ChatThreadGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ChatThreadGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetChatThreadGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ChatThread model
   */
  readonly fields: ChatThreadFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ChatThread.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ChatThreadClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    messages<T extends ChatThread$messagesArgs<ExtArgs> = {}>(args?: Subset<T, ChatThread$messagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the ChatThread model
   */ 
  interface ChatThreadFieldRefs {
    readonly id: FieldRef<"ChatThread", 'String'>
    readonly userId: FieldRef<"ChatThread", 'String'>
    readonly title: FieldRef<"ChatThread", 'String'>
    readonly routingMode: FieldRef<"ChatThread", 'RoutingMode'>
    readonly lastProvider: FieldRef<"ChatThread", 'String'>
    readonly lastModel: FieldRef<"ChatThread", 'String'>
    readonly isPinned: FieldRef<"ChatThread", 'Boolean'>
    readonly isArchived: FieldRef<"ChatThread", 'Boolean'>
    readonly createdAt: FieldRef<"ChatThread", 'DateTime'>
    readonly updatedAt: FieldRef<"ChatThread", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ChatThread findUnique
   */
  export type ChatThreadFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * Filter, which ChatThread to fetch.
     */
    where: ChatThreadWhereUniqueInput
  }

  /**
   * ChatThread findUniqueOrThrow
   */
  export type ChatThreadFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * Filter, which ChatThread to fetch.
     */
    where: ChatThreadWhereUniqueInput
  }

  /**
   * ChatThread findFirst
   */
  export type ChatThreadFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * Filter, which ChatThread to fetch.
     */
    where?: ChatThreadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatThreads to fetch.
     */
    orderBy?: ChatThreadOrderByWithRelationInput | ChatThreadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ChatThreads.
     */
    cursor?: ChatThreadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatThreads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatThreads.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ChatThreads.
     */
    distinct?: ChatThreadScalarFieldEnum | ChatThreadScalarFieldEnum[]
  }

  /**
   * ChatThread findFirstOrThrow
   */
  export type ChatThreadFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * Filter, which ChatThread to fetch.
     */
    where?: ChatThreadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatThreads to fetch.
     */
    orderBy?: ChatThreadOrderByWithRelationInput | ChatThreadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ChatThreads.
     */
    cursor?: ChatThreadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatThreads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatThreads.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ChatThreads.
     */
    distinct?: ChatThreadScalarFieldEnum | ChatThreadScalarFieldEnum[]
  }

  /**
   * ChatThread findMany
   */
  export type ChatThreadFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * Filter, which ChatThreads to fetch.
     */
    where?: ChatThreadWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatThreads to fetch.
     */
    orderBy?: ChatThreadOrderByWithRelationInput | ChatThreadOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ChatThreads.
     */
    cursor?: ChatThreadWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatThreads from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatThreads.
     */
    skip?: number
    distinct?: ChatThreadScalarFieldEnum | ChatThreadScalarFieldEnum[]
  }

  /**
   * ChatThread create
   */
  export type ChatThreadCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * The data needed to create a ChatThread.
     */
    data: XOR<ChatThreadCreateInput, ChatThreadUncheckedCreateInput>
  }

  /**
   * ChatThread createMany
   */
  export type ChatThreadCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ChatThreads.
     */
    data: ChatThreadCreateManyInput | ChatThreadCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ChatThread createManyAndReturn
   */
  export type ChatThreadCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ChatThreads.
     */
    data: ChatThreadCreateManyInput | ChatThreadCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ChatThread update
   */
  export type ChatThreadUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * The data needed to update a ChatThread.
     */
    data: XOR<ChatThreadUpdateInput, ChatThreadUncheckedUpdateInput>
    /**
     * Choose, which ChatThread to update.
     */
    where: ChatThreadWhereUniqueInput
  }

  /**
   * ChatThread updateMany
   */
  export type ChatThreadUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ChatThreads.
     */
    data: XOR<ChatThreadUpdateManyMutationInput, ChatThreadUncheckedUpdateManyInput>
    /**
     * Filter which ChatThreads to update
     */
    where?: ChatThreadWhereInput
  }

  /**
   * ChatThread upsert
   */
  export type ChatThreadUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * The filter to search for the ChatThread to update in case it exists.
     */
    where: ChatThreadWhereUniqueInput
    /**
     * In case the ChatThread found by the `where` argument doesn't exist, create a new ChatThread with this data.
     */
    create: XOR<ChatThreadCreateInput, ChatThreadUncheckedCreateInput>
    /**
     * In case the ChatThread was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ChatThreadUpdateInput, ChatThreadUncheckedUpdateInput>
  }

  /**
   * ChatThread delete
   */
  export type ChatThreadDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
    /**
     * Filter which ChatThread to delete.
     */
    where: ChatThreadWhereUniqueInput
  }

  /**
   * ChatThread deleteMany
   */
  export type ChatThreadDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ChatThreads to delete
     */
    where?: ChatThreadWhereInput
  }

  /**
   * ChatThread.messages
   */
  export type ChatThread$messagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    where?: ChatMessageWhereInput
    orderBy?: ChatMessageOrderByWithRelationInput | ChatMessageOrderByWithRelationInput[]
    cursor?: ChatMessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ChatMessageScalarFieldEnum | ChatMessageScalarFieldEnum[]
  }

  /**
   * ChatThread without action
   */
  export type ChatThreadDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatThread
     */
    select?: ChatThreadSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatThreadInclude<ExtArgs> | null
  }


  /**
   * Model ChatMessage
   */

  export type AggregateChatMessage = {
    _count: ChatMessageCountAggregateOutputType | null
    _avg: ChatMessageAvgAggregateOutputType | null
    _sum: ChatMessageSumAggregateOutputType | null
    _min: ChatMessageMinAggregateOutputType | null
    _max: ChatMessageMaxAggregateOutputType | null
  }

  export type ChatMessageAvgAggregateOutputType = {
    inputTokens: number | null
    outputTokens: number | null
    estimatedCost: Decimal | null
    latencyMs: number | null
  }

  export type ChatMessageSumAggregateOutputType = {
    inputTokens: number | null
    outputTokens: number | null
    estimatedCost: Decimal | null
    latencyMs: number | null
  }

  export type ChatMessageMinAggregateOutputType = {
    id: string | null
    threadId: string | null
    role: $Enums.MessageRole | null
    content: string | null
    provider: string | null
    model: string | null
    routingMode: $Enums.RoutingMode | null
    routerModel: string | null
    usedFallback: boolean | null
    inputTokens: number | null
    outputTokens: number | null
    estimatedCost: Decimal | null
    latencyMs: number | null
    createdAt: Date | null
  }

  export type ChatMessageMaxAggregateOutputType = {
    id: string | null
    threadId: string | null
    role: $Enums.MessageRole | null
    content: string | null
    provider: string | null
    model: string | null
    routingMode: $Enums.RoutingMode | null
    routerModel: string | null
    usedFallback: boolean | null
    inputTokens: number | null
    outputTokens: number | null
    estimatedCost: Decimal | null
    latencyMs: number | null
    createdAt: Date | null
  }

  export type ChatMessageCountAggregateOutputType = {
    id: number
    threadId: number
    role: number
    content: number
    provider: number
    model: number
    routingMode: number
    routerModel: number
    usedFallback: number
    inputTokens: number
    outputTokens: number
    estimatedCost: number
    latencyMs: number
    metadata: number
    createdAt: number
    _all: number
  }


  export type ChatMessageAvgAggregateInputType = {
    inputTokens?: true
    outputTokens?: true
    estimatedCost?: true
    latencyMs?: true
  }

  export type ChatMessageSumAggregateInputType = {
    inputTokens?: true
    outputTokens?: true
    estimatedCost?: true
    latencyMs?: true
  }

  export type ChatMessageMinAggregateInputType = {
    id?: true
    threadId?: true
    role?: true
    content?: true
    provider?: true
    model?: true
    routingMode?: true
    routerModel?: true
    usedFallback?: true
    inputTokens?: true
    outputTokens?: true
    estimatedCost?: true
    latencyMs?: true
    createdAt?: true
  }

  export type ChatMessageMaxAggregateInputType = {
    id?: true
    threadId?: true
    role?: true
    content?: true
    provider?: true
    model?: true
    routingMode?: true
    routerModel?: true
    usedFallback?: true
    inputTokens?: true
    outputTokens?: true
    estimatedCost?: true
    latencyMs?: true
    createdAt?: true
  }

  export type ChatMessageCountAggregateInputType = {
    id?: true
    threadId?: true
    role?: true
    content?: true
    provider?: true
    model?: true
    routingMode?: true
    routerModel?: true
    usedFallback?: true
    inputTokens?: true
    outputTokens?: true
    estimatedCost?: true
    latencyMs?: true
    metadata?: true
    createdAt?: true
    _all?: true
  }

  export type ChatMessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ChatMessage to aggregate.
     */
    where?: ChatMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatMessages to fetch.
     */
    orderBy?: ChatMessageOrderByWithRelationInput | ChatMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ChatMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ChatMessages
    **/
    _count?: true | ChatMessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ChatMessageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ChatMessageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ChatMessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ChatMessageMaxAggregateInputType
  }

  export type GetChatMessageAggregateType<T extends ChatMessageAggregateArgs> = {
        [P in keyof T & keyof AggregateChatMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateChatMessage[P]>
      : GetScalarType<T[P], AggregateChatMessage[P]>
  }




  export type ChatMessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ChatMessageWhereInput
    orderBy?: ChatMessageOrderByWithAggregationInput | ChatMessageOrderByWithAggregationInput[]
    by: ChatMessageScalarFieldEnum[] | ChatMessageScalarFieldEnum
    having?: ChatMessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ChatMessageCountAggregateInputType | true
    _avg?: ChatMessageAvgAggregateInputType
    _sum?: ChatMessageSumAggregateInputType
    _min?: ChatMessageMinAggregateInputType
    _max?: ChatMessageMaxAggregateInputType
  }

  export type ChatMessageGroupByOutputType = {
    id: string
    threadId: string
    role: $Enums.MessageRole
    content: string
    provider: string | null
    model: string | null
    routingMode: $Enums.RoutingMode | null
    routerModel: string | null
    usedFallback: boolean
    inputTokens: number | null
    outputTokens: number | null
    estimatedCost: Decimal | null
    latencyMs: number | null
    metadata: JsonValue | null
    createdAt: Date
    _count: ChatMessageCountAggregateOutputType | null
    _avg: ChatMessageAvgAggregateOutputType | null
    _sum: ChatMessageSumAggregateOutputType | null
    _min: ChatMessageMinAggregateOutputType | null
    _max: ChatMessageMaxAggregateOutputType | null
  }

  type GetChatMessageGroupByPayload<T extends ChatMessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ChatMessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ChatMessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ChatMessageGroupByOutputType[P]>
            : GetScalarType<T[P], ChatMessageGroupByOutputType[P]>
        }
      >
    >


  export type ChatMessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    threadId?: boolean
    role?: boolean
    content?: boolean
    provider?: boolean
    model?: boolean
    routingMode?: boolean
    routerModel?: boolean
    usedFallback?: boolean
    inputTokens?: boolean
    outputTokens?: boolean
    estimatedCost?: boolean
    latencyMs?: boolean
    metadata?: boolean
    createdAt?: boolean
    thread?: boolean | ChatThreadDefaultArgs<ExtArgs>
    attachments?: boolean | ChatMessage$attachmentsArgs<ExtArgs>
    _count?: boolean | ChatMessageCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chatMessage"]>

  export type ChatMessageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    threadId?: boolean
    role?: boolean
    content?: boolean
    provider?: boolean
    model?: boolean
    routingMode?: boolean
    routerModel?: boolean
    usedFallback?: boolean
    inputTokens?: boolean
    outputTokens?: boolean
    estimatedCost?: boolean
    latencyMs?: boolean
    metadata?: boolean
    createdAt?: boolean
    thread?: boolean | ChatThreadDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chatMessage"]>

  export type ChatMessageSelectScalar = {
    id?: boolean
    threadId?: boolean
    role?: boolean
    content?: boolean
    provider?: boolean
    model?: boolean
    routingMode?: boolean
    routerModel?: boolean
    usedFallback?: boolean
    inputTokens?: boolean
    outputTokens?: boolean
    estimatedCost?: boolean
    latencyMs?: boolean
    metadata?: boolean
    createdAt?: boolean
  }

  export type ChatMessageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    thread?: boolean | ChatThreadDefaultArgs<ExtArgs>
    attachments?: boolean | ChatMessage$attachmentsArgs<ExtArgs>
    _count?: boolean | ChatMessageCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ChatMessageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    thread?: boolean | ChatThreadDefaultArgs<ExtArgs>
  }

  export type $ChatMessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ChatMessage"
    objects: {
      thread: Prisma.$ChatThreadPayload<ExtArgs>
      attachments: Prisma.$MessageAttachmentPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      threadId: string
      role: $Enums.MessageRole
      content: string
      provider: string | null
      model: string | null
      routingMode: $Enums.RoutingMode | null
      routerModel: string | null
      usedFallback: boolean
      inputTokens: number | null
      outputTokens: number | null
      estimatedCost: Prisma.Decimal | null
      latencyMs: number | null
      metadata: Prisma.JsonValue | null
      createdAt: Date
    }, ExtArgs["result"]["chatMessage"]>
    composites: {}
  }

  type ChatMessageGetPayload<S extends boolean | null | undefined | ChatMessageDefaultArgs> = $Result.GetResult<Prisma.$ChatMessagePayload, S>

  type ChatMessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ChatMessageFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ChatMessageCountAggregateInputType | true
    }

  export interface ChatMessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ChatMessage'], meta: { name: 'ChatMessage' } }
    /**
     * Find zero or one ChatMessage that matches the filter.
     * @param {ChatMessageFindUniqueArgs} args - Arguments to find a ChatMessage
     * @example
     * // Get one ChatMessage
     * const chatMessage = await prisma.chatMessage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ChatMessageFindUniqueArgs>(args: SelectSubset<T, ChatMessageFindUniqueArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one ChatMessage that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {ChatMessageFindUniqueOrThrowArgs} args - Arguments to find a ChatMessage
     * @example
     * // Get one ChatMessage
     * const chatMessage = await prisma.chatMessage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ChatMessageFindUniqueOrThrowArgs>(args: SelectSubset<T, ChatMessageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first ChatMessage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageFindFirstArgs} args - Arguments to find a ChatMessage
     * @example
     * // Get one ChatMessage
     * const chatMessage = await prisma.chatMessage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ChatMessageFindFirstArgs>(args?: SelectSubset<T, ChatMessageFindFirstArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first ChatMessage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageFindFirstOrThrowArgs} args - Arguments to find a ChatMessage
     * @example
     * // Get one ChatMessage
     * const chatMessage = await prisma.chatMessage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ChatMessageFindFirstOrThrowArgs>(args?: SelectSubset<T, ChatMessageFindFirstOrThrowArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more ChatMessages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ChatMessages
     * const chatMessages = await prisma.chatMessage.findMany()
     * 
     * // Get first 10 ChatMessages
     * const chatMessages = await prisma.chatMessage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const chatMessageWithIdOnly = await prisma.chatMessage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ChatMessageFindManyArgs>(args?: SelectSubset<T, ChatMessageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findMany">>

    /**
     * Create a ChatMessage.
     * @param {ChatMessageCreateArgs} args - Arguments to create a ChatMessage.
     * @example
     * // Create one ChatMessage
     * const ChatMessage = await prisma.chatMessage.create({
     *   data: {
     *     // ... data to create a ChatMessage
     *   }
     * })
     * 
     */
    create<T extends ChatMessageCreateArgs>(args: SelectSubset<T, ChatMessageCreateArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many ChatMessages.
     * @param {ChatMessageCreateManyArgs} args - Arguments to create many ChatMessages.
     * @example
     * // Create many ChatMessages
     * const chatMessage = await prisma.chatMessage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ChatMessageCreateManyArgs>(args?: SelectSubset<T, ChatMessageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ChatMessages and returns the data saved in the database.
     * @param {ChatMessageCreateManyAndReturnArgs} args - Arguments to create many ChatMessages.
     * @example
     * // Create many ChatMessages
     * const chatMessage = await prisma.chatMessage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ChatMessages and only return the `id`
     * const chatMessageWithIdOnly = await prisma.chatMessage.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ChatMessageCreateManyAndReturnArgs>(args?: SelectSubset<T, ChatMessageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a ChatMessage.
     * @param {ChatMessageDeleteArgs} args - Arguments to delete one ChatMessage.
     * @example
     * // Delete one ChatMessage
     * const ChatMessage = await prisma.chatMessage.delete({
     *   where: {
     *     // ... filter to delete one ChatMessage
     *   }
     * })
     * 
     */
    delete<T extends ChatMessageDeleteArgs>(args: SelectSubset<T, ChatMessageDeleteArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one ChatMessage.
     * @param {ChatMessageUpdateArgs} args - Arguments to update one ChatMessage.
     * @example
     * // Update one ChatMessage
     * const chatMessage = await prisma.chatMessage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ChatMessageUpdateArgs>(args: SelectSubset<T, ChatMessageUpdateArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more ChatMessages.
     * @param {ChatMessageDeleteManyArgs} args - Arguments to filter ChatMessages to delete.
     * @example
     * // Delete a few ChatMessages
     * const { count } = await prisma.chatMessage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ChatMessageDeleteManyArgs>(args?: SelectSubset<T, ChatMessageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ChatMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ChatMessages
     * const chatMessage = await prisma.chatMessage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ChatMessageUpdateManyArgs>(args: SelectSubset<T, ChatMessageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ChatMessage.
     * @param {ChatMessageUpsertArgs} args - Arguments to update or create a ChatMessage.
     * @example
     * // Update or create a ChatMessage
     * const chatMessage = await prisma.chatMessage.upsert({
     *   create: {
     *     // ... data to create a ChatMessage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ChatMessage we want to update
     *   }
     * })
     */
    upsert<T extends ChatMessageUpsertArgs>(args: SelectSubset<T, ChatMessageUpsertArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of ChatMessages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageCountArgs} args - Arguments to filter ChatMessages to count.
     * @example
     * // Count the number of ChatMessages
     * const count = await prisma.chatMessage.count({
     *   where: {
     *     // ... the filter for the ChatMessages we want to count
     *   }
     * })
    **/
    count<T extends ChatMessageCountArgs>(
      args?: Subset<T, ChatMessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ChatMessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ChatMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends ChatMessageAggregateArgs>(args: Subset<T, ChatMessageAggregateArgs>): Prisma.PrismaPromise<GetChatMessageAggregateType<T>>

    /**
     * Group by ChatMessage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatMessageGroupByArgs} args - Group by arguments.
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
      T extends ChatMessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ChatMessageGroupByArgs['orderBy'] }
        : { orderBy?: ChatMessageGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, ChatMessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetChatMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ChatMessage model
   */
  readonly fields: ChatMessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ChatMessage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ChatMessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    thread<T extends ChatThreadDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ChatThreadDefaultArgs<ExtArgs>>): Prisma__ChatThreadClient<$Result.GetResult<Prisma.$ChatThreadPayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
    attachments<T extends ChatMessage$attachmentsArgs<ExtArgs> = {}>(args?: Subset<T, ChatMessage$attachmentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "findMany"> | Null>
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
   * Fields of the ChatMessage model
   */ 
  interface ChatMessageFieldRefs {
    readonly id: FieldRef<"ChatMessage", 'String'>
    readonly threadId: FieldRef<"ChatMessage", 'String'>
    readonly role: FieldRef<"ChatMessage", 'MessageRole'>
    readonly content: FieldRef<"ChatMessage", 'String'>
    readonly provider: FieldRef<"ChatMessage", 'String'>
    readonly model: FieldRef<"ChatMessage", 'String'>
    readonly routingMode: FieldRef<"ChatMessage", 'RoutingMode'>
    readonly routerModel: FieldRef<"ChatMessage", 'String'>
    readonly usedFallback: FieldRef<"ChatMessage", 'Boolean'>
    readonly inputTokens: FieldRef<"ChatMessage", 'Int'>
    readonly outputTokens: FieldRef<"ChatMessage", 'Int'>
    readonly estimatedCost: FieldRef<"ChatMessage", 'Decimal'>
    readonly latencyMs: FieldRef<"ChatMessage", 'Int'>
    readonly metadata: FieldRef<"ChatMessage", 'Json'>
    readonly createdAt: FieldRef<"ChatMessage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ChatMessage findUnique
   */
  export type ChatMessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * Filter, which ChatMessage to fetch.
     */
    where: ChatMessageWhereUniqueInput
  }

  /**
   * ChatMessage findUniqueOrThrow
   */
  export type ChatMessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * Filter, which ChatMessage to fetch.
     */
    where: ChatMessageWhereUniqueInput
  }

  /**
   * ChatMessage findFirst
   */
  export type ChatMessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * Filter, which ChatMessage to fetch.
     */
    where?: ChatMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatMessages to fetch.
     */
    orderBy?: ChatMessageOrderByWithRelationInput | ChatMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ChatMessages.
     */
    cursor?: ChatMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ChatMessages.
     */
    distinct?: ChatMessageScalarFieldEnum | ChatMessageScalarFieldEnum[]
  }

  /**
   * ChatMessage findFirstOrThrow
   */
  export type ChatMessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * Filter, which ChatMessage to fetch.
     */
    where?: ChatMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatMessages to fetch.
     */
    orderBy?: ChatMessageOrderByWithRelationInput | ChatMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ChatMessages.
     */
    cursor?: ChatMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatMessages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ChatMessages.
     */
    distinct?: ChatMessageScalarFieldEnum | ChatMessageScalarFieldEnum[]
  }

  /**
   * ChatMessage findMany
   */
  export type ChatMessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * Filter, which ChatMessages to fetch.
     */
    where?: ChatMessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatMessages to fetch.
     */
    orderBy?: ChatMessageOrderByWithRelationInput | ChatMessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ChatMessages.
     */
    cursor?: ChatMessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatMessages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatMessages.
     */
    skip?: number
    distinct?: ChatMessageScalarFieldEnum | ChatMessageScalarFieldEnum[]
  }

  /**
   * ChatMessage create
   */
  export type ChatMessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * The data needed to create a ChatMessage.
     */
    data: XOR<ChatMessageCreateInput, ChatMessageUncheckedCreateInput>
  }

  /**
   * ChatMessage createMany
   */
  export type ChatMessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ChatMessages.
     */
    data: ChatMessageCreateManyInput | ChatMessageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ChatMessage createManyAndReturn
   */
  export type ChatMessageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many ChatMessages.
     */
    data: ChatMessageCreateManyInput | ChatMessageCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ChatMessage update
   */
  export type ChatMessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * The data needed to update a ChatMessage.
     */
    data: XOR<ChatMessageUpdateInput, ChatMessageUncheckedUpdateInput>
    /**
     * Choose, which ChatMessage to update.
     */
    where: ChatMessageWhereUniqueInput
  }

  /**
   * ChatMessage updateMany
   */
  export type ChatMessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ChatMessages.
     */
    data: XOR<ChatMessageUpdateManyMutationInput, ChatMessageUncheckedUpdateManyInput>
    /**
     * Filter which ChatMessages to update
     */
    where?: ChatMessageWhereInput
  }

  /**
   * ChatMessage upsert
   */
  export type ChatMessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * The filter to search for the ChatMessage to update in case it exists.
     */
    where: ChatMessageWhereUniqueInput
    /**
     * In case the ChatMessage found by the `where` argument doesn't exist, create a new ChatMessage with this data.
     */
    create: XOR<ChatMessageCreateInput, ChatMessageUncheckedCreateInput>
    /**
     * In case the ChatMessage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ChatMessageUpdateInput, ChatMessageUncheckedUpdateInput>
  }

  /**
   * ChatMessage delete
   */
  export type ChatMessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
    /**
     * Filter which ChatMessage to delete.
     */
    where: ChatMessageWhereUniqueInput
  }

  /**
   * ChatMessage deleteMany
   */
  export type ChatMessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ChatMessages to delete
     */
    where?: ChatMessageWhereInput
  }

  /**
   * ChatMessage.attachments
   */
  export type ChatMessage$attachmentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    where?: MessageAttachmentWhereInput
    orderBy?: MessageAttachmentOrderByWithRelationInput | MessageAttachmentOrderByWithRelationInput[]
    cursor?: MessageAttachmentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageAttachmentScalarFieldEnum | MessageAttachmentScalarFieldEnum[]
  }

  /**
   * ChatMessage without action
   */
  export type ChatMessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatMessage
     */
    select?: ChatMessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChatMessageInclude<ExtArgs> | null
  }


  /**
   * Model MessageAttachment
   */

  export type AggregateMessageAttachment = {
    _count: MessageAttachmentCountAggregateOutputType | null
    _min: MessageAttachmentMinAggregateOutputType | null
    _max: MessageAttachmentMaxAggregateOutputType | null
  }

  export type MessageAttachmentMinAggregateOutputType = {
    id: string | null
    messageId: string | null
    fileId: string | null
    type: string | null
  }

  export type MessageAttachmentMaxAggregateOutputType = {
    id: string | null
    messageId: string | null
    fileId: string | null
    type: string | null
  }

  export type MessageAttachmentCountAggregateOutputType = {
    id: number
    messageId: number
    fileId: number
    type: number
    _all: number
  }


  export type MessageAttachmentMinAggregateInputType = {
    id?: true
    messageId?: true
    fileId?: true
    type?: true
  }

  export type MessageAttachmentMaxAggregateInputType = {
    id?: true
    messageId?: true
    fileId?: true
    type?: true
  }

  export type MessageAttachmentCountAggregateInputType = {
    id?: true
    messageId?: true
    fileId?: true
    type?: true
    _all?: true
  }

  export type MessageAttachmentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MessageAttachment to aggregate.
     */
    where?: MessageAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageAttachments to fetch.
     */
    orderBy?: MessageAttachmentOrderByWithRelationInput | MessageAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MessageAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageAttachments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned MessageAttachments
    **/
    _count?: true | MessageAttachmentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MessageAttachmentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MessageAttachmentMaxAggregateInputType
  }

  export type GetMessageAttachmentAggregateType<T extends MessageAttachmentAggregateArgs> = {
        [P in keyof T & keyof AggregateMessageAttachment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMessageAttachment[P]>
      : GetScalarType<T[P], AggregateMessageAttachment[P]>
  }




  export type MessageAttachmentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageAttachmentWhereInput
    orderBy?: MessageAttachmentOrderByWithAggregationInput | MessageAttachmentOrderByWithAggregationInput[]
    by: MessageAttachmentScalarFieldEnum[] | MessageAttachmentScalarFieldEnum
    having?: MessageAttachmentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MessageAttachmentCountAggregateInputType | true
    _min?: MessageAttachmentMinAggregateInputType
    _max?: MessageAttachmentMaxAggregateInputType
  }

  export type MessageAttachmentGroupByOutputType = {
    id: string
    messageId: string
    fileId: string
    type: string
    _count: MessageAttachmentCountAggregateOutputType | null
    _min: MessageAttachmentMinAggregateOutputType | null
    _max: MessageAttachmentMaxAggregateOutputType | null
  }

  type GetMessageAttachmentGroupByPayload<T extends MessageAttachmentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MessageAttachmentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MessageAttachmentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MessageAttachmentGroupByOutputType[P]>
            : GetScalarType<T[P], MessageAttachmentGroupByOutputType[P]>
        }
      >
    >


  export type MessageAttachmentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    fileId?: boolean
    type?: boolean
    message?: boolean | ChatMessageDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageAttachment"]>

  export type MessageAttachmentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    messageId?: boolean
    fileId?: boolean
    type?: boolean
    message?: boolean | ChatMessageDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["messageAttachment"]>

  export type MessageAttachmentSelectScalar = {
    id?: boolean
    messageId?: boolean
    fileId?: boolean
    type?: boolean
  }

  export type MessageAttachmentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    message?: boolean | ChatMessageDefaultArgs<ExtArgs>
  }
  export type MessageAttachmentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    message?: boolean | ChatMessageDefaultArgs<ExtArgs>
  }

  export type $MessageAttachmentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "MessageAttachment"
    objects: {
      message: Prisma.$ChatMessagePayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      messageId: string
      fileId: string
      type: string
    }, ExtArgs["result"]["messageAttachment"]>
    composites: {}
  }

  type MessageAttachmentGetPayload<S extends boolean | null | undefined | MessageAttachmentDefaultArgs> = $Result.GetResult<Prisma.$MessageAttachmentPayload, S>

  type MessageAttachmentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MessageAttachmentFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MessageAttachmentCountAggregateInputType | true
    }

  export interface MessageAttachmentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['MessageAttachment'], meta: { name: 'MessageAttachment' } }
    /**
     * Find zero or one MessageAttachment that matches the filter.
     * @param {MessageAttachmentFindUniqueArgs} args - Arguments to find a MessageAttachment
     * @example
     * // Get one MessageAttachment
     * const messageAttachment = await prisma.messageAttachment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends MessageAttachmentFindUniqueArgs>(args: SelectSubset<T, MessageAttachmentFindUniqueArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one MessageAttachment that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {MessageAttachmentFindUniqueOrThrowArgs} args - Arguments to find a MessageAttachment
     * @example
     * // Get one MessageAttachment
     * const messageAttachment = await prisma.messageAttachment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends MessageAttachmentFindUniqueOrThrowArgs>(args: SelectSubset<T, MessageAttachmentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first MessageAttachment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentFindFirstArgs} args - Arguments to find a MessageAttachment
     * @example
     * // Get one MessageAttachment
     * const messageAttachment = await prisma.messageAttachment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends MessageAttachmentFindFirstArgs>(args?: SelectSubset<T, MessageAttachmentFindFirstArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first MessageAttachment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentFindFirstOrThrowArgs} args - Arguments to find a MessageAttachment
     * @example
     * // Get one MessageAttachment
     * const messageAttachment = await prisma.messageAttachment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends MessageAttachmentFindFirstOrThrowArgs>(args?: SelectSubset<T, MessageAttachmentFindFirstOrThrowArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more MessageAttachments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all MessageAttachments
     * const messageAttachments = await prisma.messageAttachment.findMany()
     * 
     * // Get first 10 MessageAttachments
     * const messageAttachments = await prisma.messageAttachment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const messageAttachmentWithIdOnly = await prisma.messageAttachment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends MessageAttachmentFindManyArgs>(args?: SelectSubset<T, MessageAttachmentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a MessageAttachment.
     * @param {MessageAttachmentCreateArgs} args - Arguments to create a MessageAttachment.
     * @example
     * // Create one MessageAttachment
     * const MessageAttachment = await prisma.messageAttachment.create({
     *   data: {
     *     // ... data to create a MessageAttachment
     *   }
     * })
     * 
     */
    create<T extends MessageAttachmentCreateArgs>(args: SelectSubset<T, MessageAttachmentCreateArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many MessageAttachments.
     * @param {MessageAttachmentCreateManyArgs} args - Arguments to create many MessageAttachments.
     * @example
     * // Create many MessageAttachments
     * const messageAttachment = await prisma.messageAttachment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends MessageAttachmentCreateManyArgs>(args?: SelectSubset<T, MessageAttachmentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many MessageAttachments and returns the data saved in the database.
     * @param {MessageAttachmentCreateManyAndReturnArgs} args - Arguments to create many MessageAttachments.
     * @example
     * // Create many MessageAttachments
     * const messageAttachment = await prisma.messageAttachment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many MessageAttachments and only return the `id`
     * const messageAttachmentWithIdOnly = await prisma.messageAttachment.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends MessageAttachmentCreateManyAndReturnArgs>(args?: SelectSubset<T, MessageAttachmentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a MessageAttachment.
     * @param {MessageAttachmentDeleteArgs} args - Arguments to delete one MessageAttachment.
     * @example
     * // Delete one MessageAttachment
     * const MessageAttachment = await prisma.messageAttachment.delete({
     *   where: {
     *     // ... filter to delete one MessageAttachment
     *   }
     * })
     * 
     */
    delete<T extends MessageAttachmentDeleteArgs>(args: SelectSubset<T, MessageAttachmentDeleteArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one MessageAttachment.
     * @param {MessageAttachmentUpdateArgs} args - Arguments to update one MessageAttachment.
     * @example
     * // Update one MessageAttachment
     * const messageAttachment = await prisma.messageAttachment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends MessageAttachmentUpdateArgs>(args: SelectSubset<T, MessageAttachmentUpdateArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more MessageAttachments.
     * @param {MessageAttachmentDeleteManyArgs} args - Arguments to filter MessageAttachments to delete.
     * @example
     * // Delete a few MessageAttachments
     * const { count } = await prisma.messageAttachment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends MessageAttachmentDeleteManyArgs>(args?: SelectSubset<T, MessageAttachmentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more MessageAttachments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many MessageAttachments
     * const messageAttachment = await prisma.messageAttachment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends MessageAttachmentUpdateManyArgs>(args: SelectSubset<T, MessageAttachmentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one MessageAttachment.
     * @param {MessageAttachmentUpsertArgs} args - Arguments to update or create a MessageAttachment.
     * @example
     * // Update or create a MessageAttachment
     * const messageAttachment = await prisma.messageAttachment.upsert({
     *   create: {
     *     // ... data to create a MessageAttachment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the MessageAttachment we want to update
     *   }
     * })
     */
    upsert<T extends MessageAttachmentUpsertArgs>(args: SelectSubset<T, MessageAttachmentUpsertArgs<ExtArgs>>): Prisma__MessageAttachmentClient<$Result.GetResult<Prisma.$MessageAttachmentPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of MessageAttachments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentCountArgs} args - Arguments to filter MessageAttachments to count.
     * @example
     * // Count the number of MessageAttachments
     * const count = await prisma.messageAttachment.count({
     *   where: {
     *     // ... the filter for the MessageAttachments we want to count
     *   }
     * })
    **/
    count<T extends MessageAttachmentCountArgs>(
      args?: Subset<T, MessageAttachmentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MessageAttachmentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a MessageAttachment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
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
    aggregate<T extends MessageAttachmentAggregateArgs>(args: Subset<T, MessageAttachmentAggregateArgs>): Prisma.PrismaPromise<GetMessageAttachmentAggregateType<T>>

    /**
     * Group by MessageAttachment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAttachmentGroupByArgs} args - Group by arguments.
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
      T extends MessageAttachmentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MessageAttachmentGroupByArgs['orderBy'] }
        : { orderBy?: MessageAttachmentGroupByArgs['orderBy'] },
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
    >(args: SubsetIntersection<T, MessageAttachmentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMessageAttachmentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the MessageAttachment model
   */
  readonly fields: MessageAttachmentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for MessageAttachment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MessageAttachmentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    message<T extends ChatMessageDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ChatMessageDefaultArgs<ExtArgs>>): Prisma__ChatMessageClient<$Result.GetResult<Prisma.$ChatMessagePayload<ExtArgs>, T, "findUniqueOrThrow"> | Null, Null, ExtArgs>
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
   * Fields of the MessageAttachment model
   */ 
  interface MessageAttachmentFieldRefs {
    readonly id: FieldRef<"MessageAttachment", 'String'>
    readonly messageId: FieldRef<"MessageAttachment", 'String'>
    readonly fileId: FieldRef<"MessageAttachment", 'String'>
    readonly type: FieldRef<"MessageAttachment", 'String'>
  }
    

  // Custom InputTypes
  /**
   * MessageAttachment findUnique
   */
  export type MessageAttachmentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which MessageAttachment to fetch.
     */
    where: MessageAttachmentWhereUniqueInput
  }

  /**
   * MessageAttachment findUniqueOrThrow
   */
  export type MessageAttachmentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which MessageAttachment to fetch.
     */
    where: MessageAttachmentWhereUniqueInput
  }

  /**
   * MessageAttachment findFirst
   */
  export type MessageAttachmentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which MessageAttachment to fetch.
     */
    where?: MessageAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageAttachments to fetch.
     */
    orderBy?: MessageAttachmentOrderByWithRelationInput | MessageAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MessageAttachments.
     */
    cursor?: MessageAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageAttachments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MessageAttachments.
     */
    distinct?: MessageAttachmentScalarFieldEnum | MessageAttachmentScalarFieldEnum[]
  }

  /**
   * MessageAttachment findFirstOrThrow
   */
  export type MessageAttachmentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which MessageAttachment to fetch.
     */
    where?: MessageAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageAttachments to fetch.
     */
    orderBy?: MessageAttachmentOrderByWithRelationInput | MessageAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for MessageAttachments.
     */
    cursor?: MessageAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageAttachments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of MessageAttachments.
     */
    distinct?: MessageAttachmentScalarFieldEnum | MessageAttachmentScalarFieldEnum[]
  }

  /**
   * MessageAttachment findMany
   */
  export type MessageAttachmentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * Filter, which MessageAttachments to fetch.
     */
    where?: MessageAttachmentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of MessageAttachments to fetch.
     */
    orderBy?: MessageAttachmentOrderByWithRelationInput | MessageAttachmentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing MessageAttachments.
     */
    cursor?: MessageAttachmentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` MessageAttachments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` MessageAttachments.
     */
    skip?: number
    distinct?: MessageAttachmentScalarFieldEnum | MessageAttachmentScalarFieldEnum[]
  }

  /**
   * MessageAttachment create
   */
  export type MessageAttachmentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * The data needed to create a MessageAttachment.
     */
    data: XOR<MessageAttachmentCreateInput, MessageAttachmentUncheckedCreateInput>
  }

  /**
   * MessageAttachment createMany
   */
  export type MessageAttachmentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many MessageAttachments.
     */
    data: MessageAttachmentCreateManyInput | MessageAttachmentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * MessageAttachment createManyAndReturn
   */
  export type MessageAttachmentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many MessageAttachments.
     */
    data: MessageAttachmentCreateManyInput | MessageAttachmentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * MessageAttachment update
   */
  export type MessageAttachmentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * The data needed to update a MessageAttachment.
     */
    data: XOR<MessageAttachmentUpdateInput, MessageAttachmentUncheckedUpdateInput>
    /**
     * Choose, which MessageAttachment to update.
     */
    where: MessageAttachmentWhereUniqueInput
  }

  /**
   * MessageAttachment updateMany
   */
  export type MessageAttachmentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update MessageAttachments.
     */
    data: XOR<MessageAttachmentUpdateManyMutationInput, MessageAttachmentUncheckedUpdateManyInput>
    /**
     * Filter which MessageAttachments to update
     */
    where?: MessageAttachmentWhereInput
  }

  /**
   * MessageAttachment upsert
   */
  export type MessageAttachmentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * The filter to search for the MessageAttachment to update in case it exists.
     */
    where: MessageAttachmentWhereUniqueInput
    /**
     * In case the MessageAttachment found by the `where` argument doesn't exist, create a new MessageAttachment with this data.
     */
    create: XOR<MessageAttachmentCreateInput, MessageAttachmentUncheckedCreateInput>
    /**
     * In case the MessageAttachment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MessageAttachmentUpdateInput, MessageAttachmentUncheckedUpdateInput>
  }

  /**
   * MessageAttachment delete
   */
  export type MessageAttachmentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
    /**
     * Filter which MessageAttachment to delete.
     */
    where: MessageAttachmentWhereUniqueInput
  }

  /**
   * MessageAttachment deleteMany
   */
  export type MessageAttachmentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which MessageAttachments to delete
     */
    where?: MessageAttachmentWhereInput
  }

  /**
   * MessageAttachment without action
   */
  export type MessageAttachmentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the MessageAttachment
     */
    select?: MessageAttachmentSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: MessageAttachmentInclude<ExtArgs> | null
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


  export const ChatThreadScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    title: 'title',
    routingMode: 'routingMode',
    lastProvider: 'lastProvider',
    lastModel: 'lastModel',
    isPinned: 'isPinned',
    isArchived: 'isArchived',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ChatThreadScalarFieldEnum = (typeof ChatThreadScalarFieldEnum)[keyof typeof ChatThreadScalarFieldEnum]


  export const ChatMessageScalarFieldEnum: {
    id: 'id',
    threadId: 'threadId',
    role: 'role',
    content: 'content',
    provider: 'provider',
    model: 'model',
    routingMode: 'routingMode',
    routerModel: 'routerModel',
    usedFallback: 'usedFallback',
    inputTokens: 'inputTokens',
    outputTokens: 'outputTokens',
    estimatedCost: 'estimatedCost',
    latencyMs: 'latencyMs',
    metadata: 'metadata',
    createdAt: 'createdAt'
  };

  export type ChatMessageScalarFieldEnum = (typeof ChatMessageScalarFieldEnum)[keyof typeof ChatMessageScalarFieldEnum]


  export const MessageAttachmentScalarFieldEnum: {
    id: 'id',
    messageId: 'messageId',
    fileId: 'fileId',
    type: 'type'
  };

  export type MessageAttachmentScalarFieldEnum = (typeof MessageAttachmentScalarFieldEnum)[keyof typeof MessageAttachmentScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


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
   * Reference to a field of type 'MessageRole'
   */
  export type EnumMessageRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MessageRole'>
    


  /**
   * Reference to a field of type 'MessageRole[]'
   */
  export type ListEnumMessageRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'MessageRole[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


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


  export type ChatThreadWhereInput = {
    AND?: ChatThreadWhereInput | ChatThreadWhereInput[]
    OR?: ChatThreadWhereInput[]
    NOT?: ChatThreadWhereInput | ChatThreadWhereInput[]
    id?: StringFilter<"ChatThread"> | string
    userId?: StringFilter<"ChatThread"> | string
    title?: StringNullableFilter<"ChatThread"> | string | null
    routingMode?: EnumRoutingModeFilter<"ChatThread"> | $Enums.RoutingMode
    lastProvider?: StringNullableFilter<"ChatThread"> | string | null
    lastModel?: StringNullableFilter<"ChatThread"> | string | null
    isPinned?: BoolFilter<"ChatThread"> | boolean
    isArchived?: BoolFilter<"ChatThread"> | boolean
    createdAt?: DateTimeFilter<"ChatThread"> | Date | string
    updatedAt?: DateTimeFilter<"ChatThread"> | Date | string
    messages?: ChatMessageListRelationFilter
  }

  export type ChatThreadOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrderInput | SortOrder
    routingMode?: SortOrder
    lastProvider?: SortOrderInput | SortOrder
    lastModel?: SortOrderInput | SortOrder
    isPinned?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    messages?: ChatMessageOrderByRelationAggregateInput
  }

  export type ChatThreadWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ChatThreadWhereInput | ChatThreadWhereInput[]
    OR?: ChatThreadWhereInput[]
    NOT?: ChatThreadWhereInput | ChatThreadWhereInput[]
    userId?: StringFilter<"ChatThread"> | string
    title?: StringNullableFilter<"ChatThread"> | string | null
    routingMode?: EnumRoutingModeFilter<"ChatThread"> | $Enums.RoutingMode
    lastProvider?: StringNullableFilter<"ChatThread"> | string | null
    lastModel?: StringNullableFilter<"ChatThread"> | string | null
    isPinned?: BoolFilter<"ChatThread"> | boolean
    isArchived?: BoolFilter<"ChatThread"> | boolean
    createdAt?: DateTimeFilter<"ChatThread"> | Date | string
    updatedAt?: DateTimeFilter<"ChatThread"> | Date | string
    messages?: ChatMessageListRelationFilter
  }, "id">

  export type ChatThreadOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrderInput | SortOrder
    routingMode?: SortOrder
    lastProvider?: SortOrderInput | SortOrder
    lastModel?: SortOrderInput | SortOrder
    isPinned?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ChatThreadCountOrderByAggregateInput
    _max?: ChatThreadMaxOrderByAggregateInput
    _min?: ChatThreadMinOrderByAggregateInput
  }

  export type ChatThreadScalarWhereWithAggregatesInput = {
    AND?: ChatThreadScalarWhereWithAggregatesInput | ChatThreadScalarWhereWithAggregatesInput[]
    OR?: ChatThreadScalarWhereWithAggregatesInput[]
    NOT?: ChatThreadScalarWhereWithAggregatesInput | ChatThreadScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ChatThread"> | string
    userId?: StringWithAggregatesFilter<"ChatThread"> | string
    title?: StringNullableWithAggregatesFilter<"ChatThread"> | string | null
    routingMode?: EnumRoutingModeWithAggregatesFilter<"ChatThread"> | $Enums.RoutingMode
    lastProvider?: StringNullableWithAggregatesFilter<"ChatThread"> | string | null
    lastModel?: StringNullableWithAggregatesFilter<"ChatThread"> | string | null
    isPinned?: BoolWithAggregatesFilter<"ChatThread"> | boolean
    isArchived?: BoolWithAggregatesFilter<"ChatThread"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"ChatThread"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ChatThread"> | Date | string
  }

  export type ChatMessageWhereInput = {
    AND?: ChatMessageWhereInput | ChatMessageWhereInput[]
    OR?: ChatMessageWhereInput[]
    NOT?: ChatMessageWhereInput | ChatMessageWhereInput[]
    id?: StringFilter<"ChatMessage"> | string
    threadId?: StringFilter<"ChatMessage"> | string
    role?: EnumMessageRoleFilter<"ChatMessage"> | $Enums.MessageRole
    content?: StringFilter<"ChatMessage"> | string
    provider?: StringNullableFilter<"ChatMessage"> | string | null
    model?: StringNullableFilter<"ChatMessage"> | string | null
    routingMode?: EnumRoutingModeNullableFilter<"ChatMessage"> | $Enums.RoutingMode | null
    routerModel?: StringNullableFilter<"ChatMessage"> | string | null
    usedFallback?: BoolFilter<"ChatMessage"> | boolean
    inputTokens?: IntNullableFilter<"ChatMessage"> | number | null
    outputTokens?: IntNullableFilter<"ChatMessage"> | number | null
    estimatedCost?: DecimalNullableFilter<"ChatMessage"> | Decimal | DecimalJsLike | number | string | null
    latencyMs?: IntNullableFilter<"ChatMessage"> | number | null
    metadata?: JsonNullableFilter<"ChatMessage">
    createdAt?: DateTimeFilter<"ChatMessage"> | Date | string
    thread?: XOR<ChatThreadRelationFilter, ChatThreadWhereInput>
    attachments?: MessageAttachmentListRelationFilter
  }

  export type ChatMessageOrderByWithRelationInput = {
    id?: SortOrder
    threadId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    provider?: SortOrderInput | SortOrder
    model?: SortOrderInput | SortOrder
    routingMode?: SortOrderInput | SortOrder
    routerModel?: SortOrderInput | SortOrder
    usedFallback?: SortOrder
    inputTokens?: SortOrderInput | SortOrder
    outputTokens?: SortOrderInput | SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    latencyMs?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    thread?: ChatThreadOrderByWithRelationInput
    attachments?: MessageAttachmentOrderByRelationAggregateInput
  }

  export type ChatMessageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ChatMessageWhereInput | ChatMessageWhereInput[]
    OR?: ChatMessageWhereInput[]
    NOT?: ChatMessageWhereInput | ChatMessageWhereInput[]
    threadId?: StringFilter<"ChatMessage"> | string
    role?: EnumMessageRoleFilter<"ChatMessage"> | $Enums.MessageRole
    content?: StringFilter<"ChatMessage"> | string
    provider?: StringNullableFilter<"ChatMessage"> | string | null
    model?: StringNullableFilter<"ChatMessage"> | string | null
    routingMode?: EnumRoutingModeNullableFilter<"ChatMessage"> | $Enums.RoutingMode | null
    routerModel?: StringNullableFilter<"ChatMessage"> | string | null
    usedFallback?: BoolFilter<"ChatMessage"> | boolean
    inputTokens?: IntNullableFilter<"ChatMessage"> | number | null
    outputTokens?: IntNullableFilter<"ChatMessage"> | number | null
    estimatedCost?: DecimalNullableFilter<"ChatMessage"> | Decimal | DecimalJsLike | number | string | null
    latencyMs?: IntNullableFilter<"ChatMessage"> | number | null
    metadata?: JsonNullableFilter<"ChatMessage">
    createdAt?: DateTimeFilter<"ChatMessage"> | Date | string
    thread?: XOR<ChatThreadRelationFilter, ChatThreadWhereInput>
    attachments?: MessageAttachmentListRelationFilter
  }, "id">

  export type ChatMessageOrderByWithAggregationInput = {
    id?: SortOrder
    threadId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    provider?: SortOrderInput | SortOrder
    model?: SortOrderInput | SortOrder
    routingMode?: SortOrderInput | SortOrder
    routerModel?: SortOrderInput | SortOrder
    usedFallback?: SortOrder
    inputTokens?: SortOrderInput | SortOrder
    outputTokens?: SortOrderInput | SortOrder
    estimatedCost?: SortOrderInput | SortOrder
    latencyMs?: SortOrderInput | SortOrder
    metadata?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: ChatMessageCountOrderByAggregateInput
    _avg?: ChatMessageAvgOrderByAggregateInput
    _max?: ChatMessageMaxOrderByAggregateInput
    _min?: ChatMessageMinOrderByAggregateInput
    _sum?: ChatMessageSumOrderByAggregateInput
  }

  export type ChatMessageScalarWhereWithAggregatesInput = {
    AND?: ChatMessageScalarWhereWithAggregatesInput | ChatMessageScalarWhereWithAggregatesInput[]
    OR?: ChatMessageScalarWhereWithAggregatesInput[]
    NOT?: ChatMessageScalarWhereWithAggregatesInput | ChatMessageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ChatMessage"> | string
    threadId?: StringWithAggregatesFilter<"ChatMessage"> | string
    role?: EnumMessageRoleWithAggregatesFilter<"ChatMessage"> | $Enums.MessageRole
    content?: StringWithAggregatesFilter<"ChatMessage"> | string
    provider?: StringNullableWithAggregatesFilter<"ChatMessage"> | string | null
    model?: StringNullableWithAggregatesFilter<"ChatMessage"> | string | null
    routingMode?: EnumRoutingModeNullableWithAggregatesFilter<"ChatMessage"> | $Enums.RoutingMode | null
    routerModel?: StringNullableWithAggregatesFilter<"ChatMessage"> | string | null
    usedFallback?: BoolWithAggregatesFilter<"ChatMessage"> | boolean
    inputTokens?: IntNullableWithAggregatesFilter<"ChatMessage"> | number | null
    outputTokens?: IntNullableWithAggregatesFilter<"ChatMessage"> | number | null
    estimatedCost?: DecimalNullableWithAggregatesFilter<"ChatMessage"> | Decimal | DecimalJsLike | number | string | null
    latencyMs?: IntNullableWithAggregatesFilter<"ChatMessage"> | number | null
    metadata?: JsonNullableWithAggregatesFilter<"ChatMessage">
    createdAt?: DateTimeWithAggregatesFilter<"ChatMessage"> | Date | string
  }

  export type MessageAttachmentWhereInput = {
    AND?: MessageAttachmentWhereInput | MessageAttachmentWhereInput[]
    OR?: MessageAttachmentWhereInput[]
    NOT?: MessageAttachmentWhereInput | MessageAttachmentWhereInput[]
    id?: StringFilter<"MessageAttachment"> | string
    messageId?: StringFilter<"MessageAttachment"> | string
    fileId?: StringFilter<"MessageAttachment"> | string
    type?: StringFilter<"MessageAttachment"> | string
    message?: XOR<ChatMessageRelationFilter, ChatMessageWhereInput>
  }

  export type MessageAttachmentOrderByWithRelationInput = {
    id?: SortOrder
    messageId?: SortOrder
    fileId?: SortOrder
    type?: SortOrder
    message?: ChatMessageOrderByWithRelationInput
  }

  export type MessageAttachmentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: MessageAttachmentWhereInput | MessageAttachmentWhereInput[]
    OR?: MessageAttachmentWhereInput[]
    NOT?: MessageAttachmentWhereInput | MessageAttachmentWhereInput[]
    messageId?: StringFilter<"MessageAttachment"> | string
    fileId?: StringFilter<"MessageAttachment"> | string
    type?: StringFilter<"MessageAttachment"> | string
    message?: XOR<ChatMessageRelationFilter, ChatMessageWhereInput>
  }, "id">

  export type MessageAttachmentOrderByWithAggregationInput = {
    id?: SortOrder
    messageId?: SortOrder
    fileId?: SortOrder
    type?: SortOrder
    _count?: MessageAttachmentCountOrderByAggregateInput
    _max?: MessageAttachmentMaxOrderByAggregateInput
    _min?: MessageAttachmentMinOrderByAggregateInput
  }

  export type MessageAttachmentScalarWhereWithAggregatesInput = {
    AND?: MessageAttachmentScalarWhereWithAggregatesInput | MessageAttachmentScalarWhereWithAggregatesInput[]
    OR?: MessageAttachmentScalarWhereWithAggregatesInput[]
    NOT?: MessageAttachmentScalarWhereWithAggregatesInput | MessageAttachmentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"MessageAttachment"> | string
    messageId?: StringWithAggregatesFilter<"MessageAttachment"> | string
    fileId?: StringWithAggregatesFilter<"MessageAttachment"> | string
    type?: StringWithAggregatesFilter<"MessageAttachment"> | string
  }

  export type ChatThreadCreateInput = {
    id?: string
    userId: string
    title?: string | null
    routingMode?: $Enums.RoutingMode
    lastProvider?: string | null
    lastModel?: string | null
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    messages?: ChatMessageCreateNestedManyWithoutThreadInput
  }

  export type ChatThreadUncheckedCreateInput = {
    id?: string
    userId: string
    title?: string | null
    routingMode?: $Enums.RoutingMode
    lastProvider?: string | null
    lastModel?: string | null
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    messages?: ChatMessageUncheckedCreateNestedManyWithoutThreadInput
  }

  export type ChatThreadUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    lastProvider?: NullableStringFieldUpdateOperationsInput | string | null
    lastModel?: NullableStringFieldUpdateOperationsInput | string | null
    isPinned?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: ChatMessageUpdateManyWithoutThreadNestedInput
  }

  export type ChatThreadUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    lastProvider?: NullableStringFieldUpdateOperationsInput | string | null
    lastModel?: NullableStringFieldUpdateOperationsInput | string | null
    isPinned?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: ChatMessageUncheckedUpdateManyWithoutThreadNestedInput
  }

  export type ChatThreadCreateManyInput = {
    id?: string
    userId: string
    title?: string | null
    routingMode?: $Enums.RoutingMode
    lastProvider?: string | null
    lastModel?: string | null
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ChatThreadUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    lastProvider?: NullableStringFieldUpdateOperationsInput | string | null
    lastModel?: NullableStringFieldUpdateOperationsInput | string | null
    isPinned?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatThreadUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    lastProvider?: NullableStringFieldUpdateOperationsInput | string | null
    lastModel?: NullableStringFieldUpdateOperationsInput | string | null
    isPinned?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatMessageCreateInput = {
    id?: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    thread: ChatThreadCreateNestedOneWithoutMessagesInput
    attachments?: MessageAttachmentCreateNestedManyWithoutMessageInput
  }

  export type ChatMessageUncheckedCreateInput = {
    id?: string
    threadId: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    attachments?: MessageAttachmentUncheckedCreateNestedManyWithoutMessageInput
  }

  export type ChatMessageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    thread?: ChatThreadUpdateOneRequiredWithoutMessagesNestedInput
    attachments?: MessageAttachmentUpdateManyWithoutMessageNestedInput
  }

  export type ChatMessageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: MessageAttachmentUncheckedUpdateManyWithoutMessageNestedInput
  }

  export type ChatMessageCreateManyInput = {
    id?: string
    threadId: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ChatMessageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatMessageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageAttachmentCreateInput = {
    id?: string
    fileId: string
    type: string
    message: ChatMessageCreateNestedOneWithoutAttachmentsInput
  }

  export type MessageAttachmentUncheckedCreateInput = {
    id?: string
    messageId: string
    fileId: string
    type: string
  }

  export type MessageAttachmentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    message?: ChatMessageUpdateOneRequiredWithoutAttachmentsNestedInput
  }

  export type MessageAttachmentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
  }

  export type MessageAttachmentCreateManyInput = {
    id?: string
    messageId: string
    fileId: string
    type: string
  }

  export type MessageAttachmentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
  }

  export type MessageAttachmentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    messageId?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
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

  export type ChatMessageListRelationFilter = {
    every?: ChatMessageWhereInput
    some?: ChatMessageWhereInput
    none?: ChatMessageWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ChatMessageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ChatThreadCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    routingMode?: SortOrder
    lastProvider?: SortOrder
    lastModel?: SortOrder
    isPinned?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ChatThreadMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    routingMode?: SortOrder
    lastProvider?: SortOrder
    lastModel?: SortOrder
    isPinned?: SortOrder
    isArchived?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ChatThreadMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    title?: SortOrder
    routingMode?: SortOrder
    lastProvider?: SortOrder
    lastModel?: SortOrder
    isPinned?: SortOrder
    isArchived?: SortOrder
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

  export type EnumMessageRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageRole | EnumMessageRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageRoleFilter<$PrismaModel> | $Enums.MessageRole
  }

  export type EnumRoutingModeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel> | null
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRoutingModeNullableFilter<$PrismaModel> | $Enums.RoutingMode | null
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
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
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

  export type ChatThreadRelationFilter = {
    is?: ChatThreadWhereInput
    isNot?: ChatThreadWhereInput
  }

  export type MessageAttachmentListRelationFilter = {
    every?: MessageAttachmentWhereInput
    some?: MessageAttachmentWhereInput
    none?: MessageAttachmentWhereInput
  }

  export type MessageAttachmentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ChatMessageCountOrderByAggregateInput = {
    id?: SortOrder
    threadId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    routingMode?: SortOrder
    routerModel?: SortOrder
    usedFallback?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    estimatedCost?: SortOrder
    latencyMs?: SortOrder
    metadata?: SortOrder
    createdAt?: SortOrder
  }

  export type ChatMessageAvgOrderByAggregateInput = {
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    estimatedCost?: SortOrder
    latencyMs?: SortOrder
  }

  export type ChatMessageMaxOrderByAggregateInput = {
    id?: SortOrder
    threadId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    routingMode?: SortOrder
    routerModel?: SortOrder
    usedFallback?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    estimatedCost?: SortOrder
    latencyMs?: SortOrder
    createdAt?: SortOrder
  }

  export type ChatMessageMinOrderByAggregateInput = {
    id?: SortOrder
    threadId?: SortOrder
    role?: SortOrder
    content?: SortOrder
    provider?: SortOrder
    model?: SortOrder
    routingMode?: SortOrder
    routerModel?: SortOrder
    usedFallback?: SortOrder
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    estimatedCost?: SortOrder
    latencyMs?: SortOrder
    createdAt?: SortOrder
  }

  export type ChatMessageSumOrderByAggregateInput = {
    inputTokens?: SortOrder
    outputTokens?: SortOrder
    estimatedCost?: SortOrder
    latencyMs?: SortOrder
  }

  export type EnumMessageRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageRole | EnumMessageRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageRoleWithAggregatesFilter<$PrismaModel> | $Enums.MessageRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMessageRoleFilter<$PrismaModel>
    _max?: NestedEnumMessageRoleFilter<$PrismaModel>
  }

  export type EnumRoutingModeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel> | null
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRoutingModeNullableWithAggregatesFilter<$PrismaModel> | $Enums.RoutingMode | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumRoutingModeNullableFilter<$PrismaModel>
    _max?: NestedEnumRoutingModeNullableFilter<$PrismaModel>
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
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
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
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type ChatMessageRelationFilter = {
    is?: ChatMessageWhereInput
    isNot?: ChatMessageWhereInput
  }

  export type MessageAttachmentCountOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    fileId?: SortOrder
    type?: SortOrder
  }

  export type MessageAttachmentMaxOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    fileId?: SortOrder
    type?: SortOrder
  }

  export type MessageAttachmentMinOrderByAggregateInput = {
    id?: SortOrder
    messageId?: SortOrder
    fileId?: SortOrder
    type?: SortOrder
  }

  export type ChatMessageCreateNestedManyWithoutThreadInput = {
    create?: XOR<ChatMessageCreateWithoutThreadInput, ChatMessageUncheckedCreateWithoutThreadInput> | ChatMessageCreateWithoutThreadInput[] | ChatMessageUncheckedCreateWithoutThreadInput[]
    connectOrCreate?: ChatMessageCreateOrConnectWithoutThreadInput | ChatMessageCreateOrConnectWithoutThreadInput[]
    createMany?: ChatMessageCreateManyThreadInputEnvelope
    connect?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
  }

  export type ChatMessageUncheckedCreateNestedManyWithoutThreadInput = {
    create?: XOR<ChatMessageCreateWithoutThreadInput, ChatMessageUncheckedCreateWithoutThreadInput> | ChatMessageCreateWithoutThreadInput[] | ChatMessageUncheckedCreateWithoutThreadInput[]
    connectOrCreate?: ChatMessageCreateOrConnectWithoutThreadInput | ChatMessageCreateOrConnectWithoutThreadInput[]
    createMany?: ChatMessageCreateManyThreadInputEnvelope
    connect?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
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

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ChatMessageUpdateManyWithoutThreadNestedInput = {
    create?: XOR<ChatMessageCreateWithoutThreadInput, ChatMessageUncheckedCreateWithoutThreadInput> | ChatMessageCreateWithoutThreadInput[] | ChatMessageUncheckedCreateWithoutThreadInput[]
    connectOrCreate?: ChatMessageCreateOrConnectWithoutThreadInput | ChatMessageCreateOrConnectWithoutThreadInput[]
    upsert?: ChatMessageUpsertWithWhereUniqueWithoutThreadInput | ChatMessageUpsertWithWhereUniqueWithoutThreadInput[]
    createMany?: ChatMessageCreateManyThreadInputEnvelope
    set?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    disconnect?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    delete?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    connect?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    update?: ChatMessageUpdateWithWhereUniqueWithoutThreadInput | ChatMessageUpdateWithWhereUniqueWithoutThreadInput[]
    updateMany?: ChatMessageUpdateManyWithWhereWithoutThreadInput | ChatMessageUpdateManyWithWhereWithoutThreadInput[]
    deleteMany?: ChatMessageScalarWhereInput | ChatMessageScalarWhereInput[]
  }

  export type ChatMessageUncheckedUpdateManyWithoutThreadNestedInput = {
    create?: XOR<ChatMessageCreateWithoutThreadInput, ChatMessageUncheckedCreateWithoutThreadInput> | ChatMessageCreateWithoutThreadInput[] | ChatMessageUncheckedCreateWithoutThreadInput[]
    connectOrCreate?: ChatMessageCreateOrConnectWithoutThreadInput | ChatMessageCreateOrConnectWithoutThreadInput[]
    upsert?: ChatMessageUpsertWithWhereUniqueWithoutThreadInput | ChatMessageUpsertWithWhereUniqueWithoutThreadInput[]
    createMany?: ChatMessageCreateManyThreadInputEnvelope
    set?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    disconnect?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    delete?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    connect?: ChatMessageWhereUniqueInput | ChatMessageWhereUniqueInput[]
    update?: ChatMessageUpdateWithWhereUniqueWithoutThreadInput | ChatMessageUpdateWithWhereUniqueWithoutThreadInput[]
    updateMany?: ChatMessageUpdateManyWithWhereWithoutThreadInput | ChatMessageUpdateManyWithWhereWithoutThreadInput[]
    deleteMany?: ChatMessageScalarWhereInput | ChatMessageScalarWhereInput[]
  }

  export type ChatThreadCreateNestedOneWithoutMessagesInput = {
    create?: XOR<ChatThreadCreateWithoutMessagesInput, ChatThreadUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: ChatThreadCreateOrConnectWithoutMessagesInput
    connect?: ChatThreadWhereUniqueInput
  }

  export type MessageAttachmentCreateNestedManyWithoutMessageInput = {
    create?: XOR<MessageAttachmentCreateWithoutMessageInput, MessageAttachmentUncheckedCreateWithoutMessageInput> | MessageAttachmentCreateWithoutMessageInput[] | MessageAttachmentUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageAttachmentCreateOrConnectWithoutMessageInput | MessageAttachmentCreateOrConnectWithoutMessageInput[]
    createMany?: MessageAttachmentCreateManyMessageInputEnvelope
    connect?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
  }

  export type MessageAttachmentUncheckedCreateNestedManyWithoutMessageInput = {
    create?: XOR<MessageAttachmentCreateWithoutMessageInput, MessageAttachmentUncheckedCreateWithoutMessageInput> | MessageAttachmentCreateWithoutMessageInput[] | MessageAttachmentUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageAttachmentCreateOrConnectWithoutMessageInput | MessageAttachmentCreateOrConnectWithoutMessageInput[]
    createMany?: MessageAttachmentCreateManyMessageInputEnvelope
    connect?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
  }

  export type EnumMessageRoleFieldUpdateOperationsInput = {
    set?: $Enums.MessageRole
  }

  export type NullableEnumRoutingModeFieldUpdateOperationsInput = {
    set?: $Enums.RoutingMode | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type ChatThreadUpdateOneRequiredWithoutMessagesNestedInput = {
    create?: XOR<ChatThreadCreateWithoutMessagesInput, ChatThreadUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: ChatThreadCreateOrConnectWithoutMessagesInput
    upsert?: ChatThreadUpsertWithoutMessagesInput
    connect?: ChatThreadWhereUniqueInput
    update?: XOR<XOR<ChatThreadUpdateToOneWithWhereWithoutMessagesInput, ChatThreadUpdateWithoutMessagesInput>, ChatThreadUncheckedUpdateWithoutMessagesInput>
  }

  export type MessageAttachmentUpdateManyWithoutMessageNestedInput = {
    create?: XOR<MessageAttachmentCreateWithoutMessageInput, MessageAttachmentUncheckedCreateWithoutMessageInput> | MessageAttachmentCreateWithoutMessageInput[] | MessageAttachmentUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageAttachmentCreateOrConnectWithoutMessageInput | MessageAttachmentCreateOrConnectWithoutMessageInput[]
    upsert?: MessageAttachmentUpsertWithWhereUniqueWithoutMessageInput | MessageAttachmentUpsertWithWhereUniqueWithoutMessageInput[]
    createMany?: MessageAttachmentCreateManyMessageInputEnvelope
    set?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    disconnect?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    delete?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    connect?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    update?: MessageAttachmentUpdateWithWhereUniqueWithoutMessageInput | MessageAttachmentUpdateWithWhereUniqueWithoutMessageInput[]
    updateMany?: MessageAttachmentUpdateManyWithWhereWithoutMessageInput | MessageAttachmentUpdateManyWithWhereWithoutMessageInput[]
    deleteMany?: MessageAttachmentScalarWhereInput | MessageAttachmentScalarWhereInput[]
  }

  export type MessageAttachmentUncheckedUpdateManyWithoutMessageNestedInput = {
    create?: XOR<MessageAttachmentCreateWithoutMessageInput, MessageAttachmentUncheckedCreateWithoutMessageInput> | MessageAttachmentCreateWithoutMessageInput[] | MessageAttachmentUncheckedCreateWithoutMessageInput[]
    connectOrCreate?: MessageAttachmentCreateOrConnectWithoutMessageInput | MessageAttachmentCreateOrConnectWithoutMessageInput[]
    upsert?: MessageAttachmentUpsertWithWhereUniqueWithoutMessageInput | MessageAttachmentUpsertWithWhereUniqueWithoutMessageInput[]
    createMany?: MessageAttachmentCreateManyMessageInputEnvelope
    set?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    disconnect?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    delete?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    connect?: MessageAttachmentWhereUniqueInput | MessageAttachmentWhereUniqueInput[]
    update?: MessageAttachmentUpdateWithWhereUniqueWithoutMessageInput | MessageAttachmentUpdateWithWhereUniqueWithoutMessageInput[]
    updateMany?: MessageAttachmentUpdateManyWithWhereWithoutMessageInput | MessageAttachmentUpdateManyWithWhereWithoutMessageInput[]
    deleteMany?: MessageAttachmentScalarWhereInput | MessageAttachmentScalarWhereInput[]
  }

  export type ChatMessageCreateNestedOneWithoutAttachmentsInput = {
    create?: XOR<ChatMessageCreateWithoutAttachmentsInput, ChatMessageUncheckedCreateWithoutAttachmentsInput>
    connectOrCreate?: ChatMessageCreateOrConnectWithoutAttachmentsInput
    connect?: ChatMessageWhereUniqueInput
  }

  export type ChatMessageUpdateOneRequiredWithoutAttachmentsNestedInput = {
    create?: XOR<ChatMessageCreateWithoutAttachmentsInput, ChatMessageUncheckedCreateWithoutAttachmentsInput>
    connectOrCreate?: ChatMessageCreateOrConnectWithoutAttachmentsInput
    upsert?: ChatMessageUpsertWithoutAttachmentsInput
    connect?: ChatMessageWhereUniqueInput
    update?: XOR<XOR<ChatMessageUpdateToOneWithWhereWithoutAttachmentsInput, ChatMessageUpdateWithoutAttachmentsInput>, ChatMessageUncheckedUpdateWithoutAttachmentsInput>
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

  export type NestedEnumMessageRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageRole | EnumMessageRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageRoleFilter<$PrismaModel> | $Enums.MessageRole
  }

  export type NestedEnumRoutingModeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel> | null
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRoutingModeNullableFilter<$PrismaModel> | $Enums.RoutingMode | null
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

  export type NestedEnumMessageRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.MessageRole | EnumMessageRoleFieldRefInput<$PrismaModel>
    in?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.MessageRole[] | ListEnumMessageRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumMessageRoleWithAggregatesFilter<$PrismaModel> | $Enums.MessageRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumMessageRoleFilter<$PrismaModel>
    _max?: NestedEnumMessageRoleFilter<$PrismaModel>
  }

  export type NestedEnumRoutingModeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RoutingMode | EnumRoutingModeFieldRefInput<$PrismaModel> | null
    in?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.RoutingMode[] | ListEnumRoutingModeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRoutingModeNullableWithAggregatesFilter<$PrismaModel> | $Enums.RoutingMode | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumRoutingModeNullableFilter<$PrismaModel>
    _max?: NestedEnumRoutingModeNullableFilter<$PrismaModel>
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
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
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

  export type ChatMessageCreateWithoutThreadInput = {
    id?: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    attachments?: MessageAttachmentCreateNestedManyWithoutMessageInput
  }

  export type ChatMessageUncheckedCreateWithoutThreadInput = {
    id?: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    attachments?: MessageAttachmentUncheckedCreateNestedManyWithoutMessageInput
  }

  export type ChatMessageCreateOrConnectWithoutThreadInput = {
    where: ChatMessageWhereUniqueInput
    create: XOR<ChatMessageCreateWithoutThreadInput, ChatMessageUncheckedCreateWithoutThreadInput>
  }

  export type ChatMessageCreateManyThreadInputEnvelope = {
    data: ChatMessageCreateManyThreadInput | ChatMessageCreateManyThreadInput[]
    skipDuplicates?: boolean
  }

  export type ChatMessageUpsertWithWhereUniqueWithoutThreadInput = {
    where: ChatMessageWhereUniqueInput
    update: XOR<ChatMessageUpdateWithoutThreadInput, ChatMessageUncheckedUpdateWithoutThreadInput>
    create: XOR<ChatMessageCreateWithoutThreadInput, ChatMessageUncheckedCreateWithoutThreadInput>
  }

  export type ChatMessageUpdateWithWhereUniqueWithoutThreadInput = {
    where: ChatMessageWhereUniqueInput
    data: XOR<ChatMessageUpdateWithoutThreadInput, ChatMessageUncheckedUpdateWithoutThreadInput>
  }

  export type ChatMessageUpdateManyWithWhereWithoutThreadInput = {
    where: ChatMessageScalarWhereInput
    data: XOR<ChatMessageUpdateManyMutationInput, ChatMessageUncheckedUpdateManyWithoutThreadInput>
  }

  export type ChatMessageScalarWhereInput = {
    AND?: ChatMessageScalarWhereInput | ChatMessageScalarWhereInput[]
    OR?: ChatMessageScalarWhereInput[]
    NOT?: ChatMessageScalarWhereInput | ChatMessageScalarWhereInput[]
    id?: StringFilter<"ChatMessage"> | string
    threadId?: StringFilter<"ChatMessage"> | string
    role?: EnumMessageRoleFilter<"ChatMessage"> | $Enums.MessageRole
    content?: StringFilter<"ChatMessage"> | string
    provider?: StringNullableFilter<"ChatMessage"> | string | null
    model?: StringNullableFilter<"ChatMessage"> | string | null
    routingMode?: EnumRoutingModeNullableFilter<"ChatMessage"> | $Enums.RoutingMode | null
    routerModel?: StringNullableFilter<"ChatMessage"> | string | null
    usedFallback?: BoolFilter<"ChatMessage"> | boolean
    inputTokens?: IntNullableFilter<"ChatMessage"> | number | null
    outputTokens?: IntNullableFilter<"ChatMessage"> | number | null
    estimatedCost?: DecimalNullableFilter<"ChatMessage"> | Decimal | DecimalJsLike | number | string | null
    latencyMs?: IntNullableFilter<"ChatMessage"> | number | null
    metadata?: JsonNullableFilter<"ChatMessage">
    createdAt?: DateTimeFilter<"ChatMessage"> | Date | string
  }

  export type ChatThreadCreateWithoutMessagesInput = {
    id?: string
    userId: string
    title?: string | null
    routingMode?: $Enums.RoutingMode
    lastProvider?: string | null
    lastModel?: string | null
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ChatThreadUncheckedCreateWithoutMessagesInput = {
    id?: string
    userId: string
    title?: string | null
    routingMode?: $Enums.RoutingMode
    lastProvider?: string | null
    lastModel?: string | null
    isPinned?: boolean
    isArchived?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ChatThreadCreateOrConnectWithoutMessagesInput = {
    where: ChatThreadWhereUniqueInput
    create: XOR<ChatThreadCreateWithoutMessagesInput, ChatThreadUncheckedCreateWithoutMessagesInput>
  }

  export type MessageAttachmentCreateWithoutMessageInput = {
    id?: string
    fileId: string
    type: string
  }

  export type MessageAttachmentUncheckedCreateWithoutMessageInput = {
    id?: string
    fileId: string
    type: string
  }

  export type MessageAttachmentCreateOrConnectWithoutMessageInput = {
    where: MessageAttachmentWhereUniqueInput
    create: XOR<MessageAttachmentCreateWithoutMessageInput, MessageAttachmentUncheckedCreateWithoutMessageInput>
  }

  export type MessageAttachmentCreateManyMessageInputEnvelope = {
    data: MessageAttachmentCreateManyMessageInput | MessageAttachmentCreateManyMessageInput[]
    skipDuplicates?: boolean
  }

  export type ChatThreadUpsertWithoutMessagesInput = {
    update: XOR<ChatThreadUpdateWithoutMessagesInput, ChatThreadUncheckedUpdateWithoutMessagesInput>
    create: XOR<ChatThreadCreateWithoutMessagesInput, ChatThreadUncheckedCreateWithoutMessagesInput>
    where?: ChatThreadWhereInput
  }

  export type ChatThreadUpdateToOneWithWhereWithoutMessagesInput = {
    where?: ChatThreadWhereInput
    data: XOR<ChatThreadUpdateWithoutMessagesInput, ChatThreadUncheckedUpdateWithoutMessagesInput>
  }

  export type ChatThreadUpdateWithoutMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    lastProvider?: NullableStringFieldUpdateOperationsInput | string | null
    lastModel?: NullableStringFieldUpdateOperationsInput | string | null
    isPinned?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatThreadUncheckedUpdateWithoutMessagesInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: EnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode
    lastProvider?: NullableStringFieldUpdateOperationsInput | string | null
    lastModel?: NullableStringFieldUpdateOperationsInput | string | null
    isPinned?: BoolFieldUpdateOperationsInput | boolean
    isArchived?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageAttachmentUpsertWithWhereUniqueWithoutMessageInput = {
    where: MessageAttachmentWhereUniqueInput
    update: XOR<MessageAttachmentUpdateWithoutMessageInput, MessageAttachmentUncheckedUpdateWithoutMessageInput>
    create: XOR<MessageAttachmentCreateWithoutMessageInput, MessageAttachmentUncheckedCreateWithoutMessageInput>
  }

  export type MessageAttachmentUpdateWithWhereUniqueWithoutMessageInput = {
    where: MessageAttachmentWhereUniqueInput
    data: XOR<MessageAttachmentUpdateWithoutMessageInput, MessageAttachmentUncheckedUpdateWithoutMessageInput>
  }

  export type MessageAttachmentUpdateManyWithWhereWithoutMessageInput = {
    where: MessageAttachmentScalarWhereInput
    data: XOR<MessageAttachmentUpdateManyMutationInput, MessageAttachmentUncheckedUpdateManyWithoutMessageInput>
  }

  export type MessageAttachmentScalarWhereInput = {
    AND?: MessageAttachmentScalarWhereInput | MessageAttachmentScalarWhereInput[]
    OR?: MessageAttachmentScalarWhereInput[]
    NOT?: MessageAttachmentScalarWhereInput | MessageAttachmentScalarWhereInput[]
    id?: StringFilter<"MessageAttachment"> | string
    messageId?: StringFilter<"MessageAttachment"> | string
    fileId?: StringFilter<"MessageAttachment"> | string
    type?: StringFilter<"MessageAttachment"> | string
  }

  export type ChatMessageCreateWithoutAttachmentsInput = {
    id?: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    thread: ChatThreadCreateNestedOneWithoutMessagesInput
  }

  export type ChatMessageUncheckedCreateWithoutAttachmentsInput = {
    id?: string
    threadId: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ChatMessageCreateOrConnectWithoutAttachmentsInput = {
    where: ChatMessageWhereUniqueInput
    create: XOR<ChatMessageCreateWithoutAttachmentsInput, ChatMessageUncheckedCreateWithoutAttachmentsInput>
  }

  export type ChatMessageUpsertWithoutAttachmentsInput = {
    update: XOR<ChatMessageUpdateWithoutAttachmentsInput, ChatMessageUncheckedUpdateWithoutAttachmentsInput>
    create: XOR<ChatMessageCreateWithoutAttachmentsInput, ChatMessageUncheckedCreateWithoutAttachmentsInput>
    where?: ChatMessageWhereInput
  }

  export type ChatMessageUpdateToOneWithWhereWithoutAttachmentsInput = {
    where?: ChatMessageWhereInput
    data: XOR<ChatMessageUpdateWithoutAttachmentsInput, ChatMessageUncheckedUpdateWithoutAttachmentsInput>
  }

  export type ChatMessageUpdateWithoutAttachmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    thread?: ChatThreadUpdateOneRequiredWithoutMessagesNestedInput
  }

  export type ChatMessageUncheckedUpdateWithoutAttachmentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    threadId?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatMessageCreateManyThreadInput = {
    id?: string
    role: $Enums.MessageRole
    content: string
    provider?: string | null
    model?: string | null
    routingMode?: $Enums.RoutingMode | null
    routerModel?: string | null
    usedFallback?: boolean
    inputTokens?: number | null
    outputTokens?: number | null
    estimatedCost?: Decimal | DecimalJsLike | number | string | null
    latencyMs?: number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
  }

  export type ChatMessageUpdateWithoutThreadInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: MessageAttachmentUpdateManyWithoutMessageNestedInput
  }

  export type ChatMessageUncheckedUpdateWithoutThreadInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    attachments?: MessageAttachmentUncheckedUpdateManyWithoutMessageNestedInput
  }

  export type ChatMessageUncheckedUpdateManyWithoutThreadInput = {
    id?: StringFieldUpdateOperationsInput | string
    role?: EnumMessageRoleFieldUpdateOperationsInput | $Enums.MessageRole
    content?: StringFieldUpdateOperationsInput | string
    provider?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    routingMode?: NullableEnumRoutingModeFieldUpdateOperationsInput | $Enums.RoutingMode | null
    routerModel?: NullableStringFieldUpdateOperationsInput | string | null
    usedFallback?: BoolFieldUpdateOperationsInput | boolean
    inputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    outputTokens?: NullableIntFieldUpdateOperationsInput | number | null
    estimatedCost?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    latencyMs?: NullableIntFieldUpdateOperationsInput | number | null
    metadata?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageAttachmentCreateManyMessageInput = {
    id?: string
    fileId: string
    type: string
  }

  export type MessageAttachmentUpdateWithoutMessageInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
  }

  export type MessageAttachmentUncheckedUpdateWithoutMessageInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
  }

  export type MessageAttachmentUncheckedUpdateManyWithoutMessageInput = {
    id?: StringFieldUpdateOperationsInput | string
    fileId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ChatThreadCountOutputTypeDefaultArgs instead
     */
    export type ChatThreadCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ChatThreadCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ChatMessageCountOutputTypeDefaultArgs instead
     */
    export type ChatMessageCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ChatMessageCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ChatThreadDefaultArgs instead
     */
    export type ChatThreadArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ChatThreadDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ChatMessageDefaultArgs instead
     */
    export type ChatMessageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ChatMessageDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MessageAttachmentDefaultArgs instead
     */
    export type MessageAttachmentArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MessageAttachmentDefaultArgs<ExtArgs>

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