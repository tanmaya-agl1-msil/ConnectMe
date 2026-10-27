import type { ApiError } from '@connectme/shared';
import { ErrorCode } from '@connectme/shared';
import type { FastifyError, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError } from './app-error';

function body(
  code: string,
  message: string,
  requestId: string,
  details?: ApiError['error']['details'],
): ApiError {
  return { error: { code, message, requestId, ...(details ? { details } : {}) } };
}

/**
 * Converts every error into the uniform `ApiError` envelope.
 * Unexpected errors are logged in full but returned to the client as a generic 500,
 * so stack traces and internals never leak.
 */
const errorHandler: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((v) => ({
        path: v.instancePath.replace(/^\//, '').replaceAll('/', '.') || '(root)',
        message: v.message ?? 'Invalid value',
      }));
      return reply
        .status(400)
        .send(body(ErrorCode.VALIDATION_ERROR, 'Request validation failed', request.id, details));
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'response failed schema serialization');
      return reply
        .status(500)
        .send(body(ErrorCode.INTERNAL_ERROR, 'Internal server error', request.id));
    }

    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(body(error.code, error.message, request.id, error.details));
    }

    const status = error.statusCode ?? 500;
    if (status === 413) {
      return reply
        .status(413)
        .send(body(ErrorCode.PAYLOAD_TOO_LARGE, 'Payload too large', request.id));
    }
    if (status === 429) {
      return reply.status(429).send(body(ErrorCode.RATE_LIMITED, error.message, request.id));
    }
    if (status >= 400 && status < 500) {
      // Fastify's own 4xx errors (malformed JSON, unsupported media type, ...) have safe messages.
      return reply.status(status).send(body(ErrorCode.BAD_REQUEST, error.message, request.id));
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply
      .status(500)
      .send(body(ErrorCode.INTERNAL_ERROR, 'Internal server error', request.id));
  });

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(body(ErrorCode.NOT_FOUND, 'Route not found', request.id)),
  );
};

export default fp(errorHandler, { name: 'core-error-handler' });
