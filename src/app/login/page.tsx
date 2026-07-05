"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Loader2 } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { syncUserData } from "@/services/syncService";
import { useAuthStore } from "@/store/auth.store";
import { useGamificationStore } from "@/store/gamification.store";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const recordDailyActivity = useGamificationStore((s) => s.recordDailyActivity);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        mode === "login"
          ? await apiClient.login({ email, password })
          : await apiClient.register({ name, email, password });
      login(res.user, {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      recordDailyActivity();
      await syncUserData();
      router.push("/profile");
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Erro ao autenticar. Verifique se o backend está rodando.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="border-border bg-surface/50 rounded-2xl border p-8 shadow-xl">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Entrar no AnimeVerse" : "Criar conta"}
        </h1>
        <p className="text-muted mt-1 text-sm">
          Sincronize favoritos, histórico e recomendações personalizadas.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "register" && (
            <Field
              label="Nome"
              value={name}
              onChange={setName}
              required
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />
          <Field
            label="Senha"
            type="password"
            value={password}
            onChange={setPassword}
            required
            minLength={6}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand-gradient flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "login" ? (
              <>
                <LogIn className="size-4" /> Entrar
              </>
            ) : (
              <>
                <UserPlus className="size-4" /> Criar conta
              </>
            )}
          </button>
        </form>

        <GoogleSignInButton />

        <p className="text-muted mt-4 text-center text-sm">
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-primary font-medium hover:underline"
          >
            {mode === "login" ? "Registrar" : "Entrar"}
          </button>
        </p>

        <p className="text-muted mt-6 text-center text-xs">
          Backend: {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}
        </p>
      </div>

      <Link
        href="/"
        className="text-muted hover:text-foreground mt-6 text-center text-sm transition-colors"
      >
        ← Voltar ao início
      </Link>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-muted mb-1 block text-xs font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="border-border bg-card focus:border-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
      />
    </label>
  );
}
