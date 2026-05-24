// HttpsOptions intentionally NOT imported from @nestjs/common to avoid a
// hard dep on the http2 typings. The cert/key shape below is the strict
// subset NestFactory.create(AppModule, { httpsOptions }) consumes.
export type HttpsOptions = {
  cert: Buffer;
  key: Buffer;
};
