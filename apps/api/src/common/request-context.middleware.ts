import { Injectable, type NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { RequestContext } from "../identity/types.js";

declare module "fastify" {
  interface FastifyRequest {
    educoreContext?: RequestContext;
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(
    request: FastifyRequest & { educoreContext?: RequestContext },
    response: FastifyReply,
    next: () => void,
  ): void {
    const header = request.headers["x-request-id"];
    const requestId = (Array.isArray(header) ? header[0] : header)?.trim() || randomUUID();
    response.header("x-request-id", requestId);
    request.educoreContext = { requestId };
    next();
  }
}
