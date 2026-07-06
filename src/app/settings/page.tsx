"use client";

import { Settings, Bell, Palette, Shield, Database } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import { GlassPanel } from "@/components/ui/GlassPanel";
import Link from "next/link";

export default function SettingsPage() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
        <Settings className="text-primary size-7" />
        Configurações
      </h1>
      <p className="text-muted mt-1 text-sm">Personalize sua experiência no AnimeVerse.</p>

      <div className="mt-8 space-y-4">
        <SettingGroup title="Conta" icon={Shield}>
          {hydrated && user ? (
            <>
              <SettingRow label="Nome" value={user.name} />
              <SettingRow label="Email" value={user.email} />
              <button
                type="button"
                onClick={() => logout()}
                className="text-warning mt-2 text-sm font-medium hover:underline"
              >
                Sair da conta
              </button>
            </>
          ) : (
            <Link href="/login" className="text-primary text-sm font-medium hover:underline">
              Entrar para sincronizar dados
            </Link>
          )}
        </SettingGroup>

        <SettingGroup title="Notificações" icon={Bell}>
          <SettingToggle label="Novos episódios" defaultOn />
          <SettingToggle label="Recomendações semanais" defaultOn />
          <SettingToggle label="Conquistas e badges" defaultOn />
        </SettingGroup>

        <SettingGroup title="Aparência" icon={Palette}>
          <SettingRow label="Tema" value="Dark Premium" />
          <SettingRow label="Cores dinâmicas" value="Ativado" />
        </SettingGroup>

        <SettingGroup title="Dados" icon={Database}>
          <SettingRow label="Cache do catálogo" value="30 min" />
          <SettingRow label="Fonte" value="MyAnimeList / Jikan" />
        </SettingGroup>
      </div>
    </div>
  );
}

function SettingGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Settings;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel className="p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Icon className="text-primary size-5" />
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </GlassPanel>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SettingToggle({
  label,
  defaultOn,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <input
        type="checkbox"
        defaultChecked={defaultOn}
        className="accent-primary size-4 rounded"
      />
    </label>
  );
}
