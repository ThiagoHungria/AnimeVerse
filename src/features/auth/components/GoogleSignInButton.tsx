"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { apiClient } from "@/services/apiClient";
import { syncUserData } from "@/services/syncService";
import { useAuthStore } from "@/store/auth.store";
import { useGamificationStore } from "@/store/gamification.store";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const recordDailyActivity = useGamificationStore((s) => s.recordDailyActivity);
  const [error, setError] = useState("");

  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) return;
    setError("");
    try {
      const res = await apiClient.googleLogin(response.credential);
      login(res.user, {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      });
      recordDailyActivity();
      await syncUserData();
      router.push("/profile");
    } catch {
      setError("Falha ao entrar com Google. Tente novamente.");
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="relative flex items-center gap-3 py-1">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted text-xs">ou</span>
        <div className="bg-border h-px flex-1" />
      </div>
      <div className="flex justify-center [&>div]:w-full">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google indisponível no momento.")}
          theme="filled_black"
          size="large"
          width="100%"
          text="continue_with"
          shape="pill"
        />
      </div>
      {error && (
        <p className="text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
