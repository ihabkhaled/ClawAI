#!/usr/bin/env node
/**
 * scripts/vercel/generate-configs.mjs — write the per-service Vercel artefacts
 * that must exist in the repository at deploy time:
 *
 *   apps/<service>/vercel.json   project-level build + function settings
 *   apps/<service>/api/index.js  serverless entry that serves the Nest app
 *
 * Both are COMMITTED files, because Vercel reads them from the checkout. They
 * are generated rather than hand-written so they can never drift from
 * deploy/vercel/projects.json.
 *
 * Re-run after editing projects.json:
 *   node scripts/vercel/generate-configs.mjs
 *   node scripts/vercel/generate-configs.mjs --check   # CI: fail if stale
 *
 * WHY api/index.js and not dist/main.js:
 * `dist/main.js` calls `app.listen()`, which is how a long-running container
 * works and is exactly what a Vercel function must not do. The entry below
 * builds the same Nest application, skips `listen()`, and hands Vercel the bare
 * Express instance. It requires the COMPILED output (not src/) because Nest's
 * dependency injection needs `emitDecoratorMetadata`, which the esbuild-based
 * Vercel TypeScript path does not emit.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, loadProjects, parseArgs, log, runScript } from './lib/common.mjs';

/**
 * All 16 projects are linked to the SAME GitHub repository, so leaving Vercel's
 * Git integration on means one push fans out into 16 automatic deployments —
 * which exhausted the free plan's 100-deployments-per-day quota. The GitHub
 * Actions workflows are the deployment driver; Vercel should build only when
 * they ask it to. The repo link stays (the dashboard and CLI need it).
 */
const GIT_DEPLOYMENTS_DISABLED = { deploymentEnabled: false };

/** Services whose work is long-running enough to need more than the default 60s. */
const EXTENDED_DURATION = new Set(['chat', 'image', 'research', 'file', 'file-generation']);

/** Express raw-body rules a service applies before the JSON parser. */
const RAW_BODY_RULES = {
  // Webhook HMAC verification needs the unparsed bytes.
  workspace: {
    pattern: '^\\/api\\/v1\\/workspace\\/webhooks\\/.+',
    limitVariable: 'WEBHOOK_BODY_MAX_BYTES',
    limitDefault: 1048576,
  },
};

function serviceLoggerName(project) {
  // Matches the name each main.ts passes to RabbitMQLoggerService.
  return project.projectName.replace(/^claw-/, '');
}

function renderHandler(project) {
  const rawBody = RAW_BODY_RULES[project.key];
  const rawBodyBlock =
    rawBody === undefined
      ? ''
      : `
  // ${project.key}: webhook signature verification needs the raw request body,
  // so the raw parser is mounted on the webhook prefix before the JSON parser.
  const rawLimit = Number(process.env['${rawBody.limitVariable}'] ?? ${rawBody.limitDefault});
  app.use(new RegExp('${rawBody.pattern}'), express.raw({ type: '*/*', limit: rawLimit + 'b' }));
  app.use(express.json({ limit: '10mb' }));
`;

  return `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/vercel/generate-configs.mjs
 *
 * Vercel serverless entry for ${project.projectName}.
 *
 * Mirrors the bootstrap in src/main.ts with one deliberate difference: it never
 * calls app.listen(). A Vercel function is handed an incoming request and must
 * return the Express handler, not bind a port.
 *
 * The compiled dist/ output is required (not src/) because NestJS dependency
 * injection relies on emitDecoratorMetadata, which only the tsgo build emits.
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');

const { AppModule } = require('../dist/app/app.module');

/**
 * Cached across warm invocations. Booting Nest costs hundreds of milliseconds,
 * so the first request pays for it and the rest of that instance's lifetime
 * reuses it. The promise (not the app) is cached so two concurrent cold
 * requests cannot bootstrap twice.
 */
let appPromise;

async function bootstrap() {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bufferLogs: true,
    // No httpsOptions: TLS terminates at Vercel's edge, not in the function.
  });

  app.use(helmet());
${rawBodyBlock}
  app.setGlobalPrefix('api/v1');

  const corsOrigins = (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  try {
    const { RabbitMQService, RabbitMQLoggerService } = require('@claw/shared-rabbitmq');
    const rabbitLogger = new RabbitMQLoggerService();
    rabbitLogger.setRabbitMQ(app.get(RabbitMQService), '${serviceLoggerName(project)}');
    app.useLogger(rabbitLogger);
  } catch {
    // RabbitMQ unavailable — fall through to the default logger rather than
    // failing the whole request. Log delivery is best-effort here.
  }

  await app.init();
  return server;
}

module.exports = async function handler(request, response) {
  if (appPromise === undefined) {
    appPromise = bootstrap().catch((error) => {
      // Clear the cache so the next invocation retries instead of serving a
      // permanently poisoned promise for the life of the instance.
      appPromise = undefined;
      throw error;
    });
  }
  const server = await appPromise;
  return server(request, response);
};
`;
}

function renderVercelJson(project) {
  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    version: 2,
    installCommand: project.installCommand,
    buildCommand: project.buildCommand,
    // Nest services are plain Node functions, not a detected framework.
    framework: null,
    // Vercel requires a static output directory whenever a custom buildCommand
    // is set. These projects serve everything through api/index.js and emit no
    // static assets, so the build creates an empty public/ for it to find.
    outputDirectory: project.outputDirectory,
    functions: {
      'api/index.js': {
        // Hobby plans cap maxDuration at 60s. Raise the plan or lower this
        // value if a deploy is rejected for exceeding the account limit.
        maxDuration: EXTENDED_DURATION.has(project.key) ? 300 : 60,
        memory: 1024,
        // Vercel's bundler traces `require` graphs statically. NestJS resolves
        // a lot at runtime, and the generated Prisma client ships a native
        // query-engine binary that no static trace will find — so ship the
        // whole build output rather than hope the trace is complete.
        includeFiles: 'dist/**',
      },
    },
    // Everything reaches the Nest router; Nest's own global prefix and route
    // table decide what is a 404.
    rewrites: [{ source: '/(.*)', destination: '/api/index.js' }],
    git: GIT_DEPLOYMENTS_DISABLED,
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

function renderFrontendVercelJson(project) {
  const config = {
    $schema: 'https://openapi.vercel.sh/vercel.json',
    version: 2,
    framework: 'nextjs',
    installCommand: project.installCommand,
    buildCommand: project.buildCommand,
    outputDirectory: project.outputDirectory,
    git: GIT_DEPLOYMENTS_DISABLED,
    // Backend proxying is declared in next.config.mjs rewrites(), driven by the
    // *_SERVICE_URL variables that resolve-service-urls.mjs syncs. Putting it
    // there rather than here keeps one source of truth for the route map.
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

async function main() {
  const { flags } = parseArgs();
  const checkOnly = flags.check === true;
  const manifest = loadProjects();
  const deployable = manifest.projects.filter((project) => project.status === 'enabled');

  log.step(`${checkOnly ? 'Checking' : 'Generating'} Vercel configs for ${deployable.length} project(s)`);

  const stale = [];
  let written = 0;

  for (const project of deployable) {
    const root = join(REPO_ROOT, project.rootDirectory);

    const targets = [];
    if (project.framework === 'nextjs') {
      targets.push({ path: join(root, 'vercel.json'), contents: renderFrontendVercelJson(project) });
    } else {
      targets.push({ path: join(root, 'vercel.json'), contents: renderVercelJson(project) });
      targets.push({ path: join(root, 'api', 'index.js'), contents: renderHandler(project) });
    }

    for (const target of targets) {
      const current = existsSync(target.path) ? readFileSync(target.path, 'utf8') : null;
      // Compare content, not line endings. Git checks these files out with CRLF
      // on Windows while the generator always emits LF, so a raw comparison
      // reports every file as stale on a Windows working copy.
      if (current !== null && current.replace(/\r\n/g, '\n') === target.contents) {
        continue;
      }
      const relative = target.path.slice(REPO_ROOT.length + 1).replace(/\\/g, '/');
      if (checkOnly) {
        stale.push(relative);
        continue;
      }
      mkdirSync(join(target.path, '..'), { recursive: true });
      writeFileSync(target.path, target.contents, 'utf8');
      log.ok(`wrote ${relative}`);
      written += 1;
    }
  }

  if (checkOnly) {
    if (stale.length > 0) {
      log.error(`${stale.length} generated file(s) are stale or missing:`);
      for (const path of stale) {
        log.plain(`  ${path}`);
      }
      log.error('Run `node scripts/vercel/generate-configs.mjs` and commit the result.');
      return 1;
    }
    log.ok('All generated Vercel configs are up to date.');
    return 0;
  }

  log.ok(written === 0 ? 'Already up to date.' : `${written} file(s) written.`);
  return 0;
}

await runScript('vercel:generate-configs', main);
