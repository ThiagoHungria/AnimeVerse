import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "../../prisma/prisma.service";
import type { GoogleDto, LoginDto, RefreshDto, RegisterDto } from "./dto/auth.dto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        preferences: { create: {} },
      },
      select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.name,
    );
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { success: true };
  }

  async googleLogin(dto: GoogleDto) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw new BadRequestException("Google login is not configured");
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: dto.idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException("Invalid Google token");
    }

    const email = payload.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: payload.name ?? payload.email.split("@")[0] ?? "Usuário",
          email,
          avatar: payload.picture ?? null,
          provider: "google",
          oauthId: payload.sub,
          preferences: { create: {} },
        },
      });
    } else if (user.provider === "local" && !user.oauthId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: "google",
          oauthId: payload.sub,
          avatar: user.avatar ?? payload.picture ?? null,
        },
      });
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    name: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, name },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get("JWT_ACCESS_TTL") ?? "900s",
      },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const refreshTtl = this.config.get("JWT_REFRESH_TTL") ?? "7d";
    const expiresAt = new Date(Date.now() + parseDuration(refreshTtl));

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}

/** Parse simple duration strings like "7d", "900s", "1h". */
function parseDuration(raw: string): number {
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  switch (match[2]) {
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    default:
      return n * 24 * 60 * 60 * 1000;
  }
}
