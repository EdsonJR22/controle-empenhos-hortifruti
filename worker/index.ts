import handler from "vinext/server/app-router-entry";

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
