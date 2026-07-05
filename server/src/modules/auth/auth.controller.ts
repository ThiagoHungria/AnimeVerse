import { Body, Controller, Post } from "@nestjs/common";
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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.auth.register(dto);
  }

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

  @Post("google")
  google(@Body(new ZodValidationPipe(googleSchema)) dto: GoogleDto) {
    return this.auth.googleLogin(dto);
  }
}
