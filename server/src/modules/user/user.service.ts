import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { UpdateProfileDto } from "./dto/user.dto";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        preferences: {
          select: {
            preferredGenres: true,
            genreScores: true,
            totalWatchTime: true,
          },
        },
        _count: { select: { favorites: true, watchHistory: true } },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        avatar: dto.avatar ?? undefined,
        preferences: dto.preferredGenres
          ? {
              upsert: {
                create: { preferredGenres: dto.preferredGenres },
                update: { preferredGenres: dto.preferredGenres },
              },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        preferences: {
          select: {
            preferredGenres: true,
            genreScores: true,
            totalWatchTime: true,
          },
        },
      },
    });
    return user;
  }
}
