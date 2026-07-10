import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  googleSchema,
  type GoogleDto,
  type LoginDto,
  type RefreshDto,
  type RegisterDto,
} from "./dto/auth.dto";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

/** Stricter limit for credential-based auth endpoints (per IP). */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("refresh")
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post("logout")
  logout(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Throttle(AUTH_THROTTLE)
  @Post("google")
  google(@Body(new ZodValidationPipe(googleSchema)) dto: GoogleDto) {
    return this.auth.googleLogin(dto);
  }
}
