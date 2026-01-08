import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestContext = {
  requestId: string;
  userId?: string;
  route?: string;
  method?: string;
};

const als = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function enterWithRequestContext(ctx: RequestContext) {
  als.enterWith(ctx);
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

export function setRequestContextPatch(patch: Partial<RequestContext>) {
  const current = als.getStore();
  if (!current) return;
  Object.assign(current, patch);
}

export function setUserId(userId: string | undefined) {
  setRequestContextPatch({ userId });
}
