import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { AppConfig } from '../config';
import { errors } from '../errors';

export interface SecurityPluginOptions {
  config: AppConfig;
}

/** Security headers, CORS policy and the global rate limit. Route-specific limits come later. */
const securityPlugin: FastifyPluginAsync<SecurityPluginOptions> = async (app, { config }) => {
  // JSON-only API: lock the CSP down completely and force HTTPS for a year.
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: { maxAge: 31_536_000, includeSubDomains: true },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  });

  // Native apps don't send an Origin header, so CORS only matters for browsers. Deny by default.
  await app.register(cors, {
    origin: config.cors.origins.length > 0 ? config.cors.origins : false,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
    errorResponseBuilder: (_request, context) =>
      errors.rateLimited(`Too many requests, retry in ${context.after}`),
  });
};

export default fp(securityPlugin, { name: 'core-security' });
