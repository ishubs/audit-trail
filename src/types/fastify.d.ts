import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    requestStart: number;
    requestContext?: {
      requestId: string;
      userId?: string;
      route?: string;
      method?: string;
    };
    user?: {
      id: string;
      name: string;
      role: 'admin' | 'reviewer';
    };
  }

  interface FastifyInstance {
    env: unknown;
  }
}

