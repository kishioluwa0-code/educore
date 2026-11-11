import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { AppModule } from "./app.module.js";
import { loadEnv } from "./common/env.js";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: env.NODE_ENV !== "test" }),
  );

  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
  const fastify = app.getHttpAdapter().getInstance();
  const requestStartTimes = new WeakMap<object, bigint>();
  fastify.addHook("onRequest", async (request, reply) => {
    const header = request.headers["x-request-id"];
    const requestId = (Array.isArray(header) ? header[0] : header)?.trim() || randomUUID();
    reply.header("x-request-id", requestId);
    request.educoreContext = { requestId };
    requestStartTimes.set(request, process.hrtime.bigint());
  });
  fastify.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        requestId: request.educoreContext?.requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Number((Number(process.hrtime.bigint() - (requestStartTimes.get(request) ?? process.hrtime.bigint())) / 1_000_000).toFixed(2)),
      },
      "request.completed",
    );
  });
  app.setGlobalPrefix("api");
  app.enableCors({ origin: env.API_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  await app.listen({ host: "0.0.0.0", port: env.API_PORT });
}

bootstrap().catch((error: unknown) => {
  console.error("EduCore API failed to start", error);
  process.exitCode = 1;
});
