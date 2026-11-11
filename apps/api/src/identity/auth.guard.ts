import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { SESSION_COOKIE } from "./session.service.js";
import { AuthService } from "./auth.service.js";
import type { RequestContext } from "./types.js";

export type EducoreRequest = FastifyRequest & {
  educoreContext?: RequestContext;
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EducoreRequest>();
    const principal = await this.authService.findPrincipal(request.cookies?.[SESSION_COOKIE]);
    if (!principal) throw new UnauthorizedException("Authentication is required");

    const header = request.headers["x-request-id"];
    const requestId = (Array.isArray(header) ? header[0] : header) || "unknown";
    request.educoreContext = { requestId, principal };
    return true;
  }
}
