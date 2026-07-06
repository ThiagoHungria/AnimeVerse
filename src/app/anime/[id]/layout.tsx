import type { Metadata } from "next";
import { animeService } from "@/services/animeService";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const anime = await animeService.getById(id).catch(() => null);

  if (!anime) {
    return { title: "Anime não encontrado" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://anime-verse-khaki.vercel.app";

  return {
    title: anime.title,
    description: anime.description.slice(0, 160),
    openGraph: {
      title: anime.title,
      description: anime.description.slice(0, 160),
      images: [`${siteUrl}/anime/${id}/opengraph-image`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: anime.title,
      description: anime.description.slice(0, 160),
      images: [`${siteUrl}/anime/${id}/opengraph-image`],
    },
  };
}

export default function AnimeLayout({ children }: Props) {
  return children;
}
