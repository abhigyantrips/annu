import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { api, ApiError } from "@/lib/api";
export function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <ThemeToggle />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/login", { password });
              onLogin();
            } catch (e) {
              if (e instanceof ApiError && e.status === 401) {
                window.location.assign(
                  "https://www.youtube.com/watch?v=cw9FIeHbdB8",
                );
                return;
              }
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Password
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button type="submit" variant="default" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : null}Continue
            <ArrowUpRight size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
