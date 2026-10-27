/** The server answered with a non-2xx status (body follows the shared ApiError envelope). */
export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** The request never reached the server (offline, TLS failure, timeout, blocked by OS policy). */
export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Refused before sending: the URL wasn't https://. */
export class InsecureTransportError extends Error {
  constructor(url: string) {
    // Only log the scheme + host, never query strings.
    let target = 'invalid URL';
    try {
      const u = new URL(url);
      target = `${u.protocol}//${u.host}`;
    } catch {
      // keep default
    }
    super(`Refusing to send a request over an insecure transport (${target})`);
    this.name = 'InsecureTransportError';
  }
}
