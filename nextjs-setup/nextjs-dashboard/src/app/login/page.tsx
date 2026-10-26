"use client";

import { useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/layout/SiteNav";

/**
 * LoginPage — /login route.
 *
 * Email + password form. On success, sets a secure httpOnly session cookie
 * via the API response and redirects to /dashboard.
 * Demo credentials: admin@smmai.com / admin (password hashed with bcrypt).
 *
 * Design: DESIGN.md — login form uses same tokens (calm ENERGY 1 on auth page).
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError((data as { message?: string }).message ?? "Login failed");
        return;
      }

      if ((data as { user?: any }).user) {
        // In production, the server would set a secure httpOnly cookie
        // and the frontend would use session management
        // Instead of localStorage, we just redirect and let the middleware
        // validate the session on protected routes
        window.location.href = "/dashboard";
      } else {
        setError(data.message ?? "Login failed");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SiteNav />

      <main
        id="main-content"
        style={{ paddingTop: "64px", minHeight: "100vh" }}
        aria-label="Sign in"
      >
        <div className="login-wrap">
          <div className="login-card">
            <h2 style={{ marginTop: 0, marginBottom: "1.5rem" }}>
              Sign in to S M M <span className="ai">AI</span>
            </h2>

            {error && (
              <div
                role="alert"
                style={{
                  marginBottom: "1rem",
                  padding: ".75rem",
                  borderLeft: "3px solid var(--primary)",
                  background: "var(--primary-light)",
                  borderRadius: "var(--radius-small)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text)",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="loginEmail">Email</label>
                <input
                  id="loginEmail"
                  type="email"
                  name="email"
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  id="loginPassword"
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.5rem",
                  gap: "1rem",
                }}
              >
                <button type="submit" className="btn primary" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>
                <Link
                  href="#"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--muted)",
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  fontSize: "var(--text-sm)",
                  color: "var(--muted)",
                }}
              >
                <Link
                  href="#"
                  style={{ color: "var(--primary)", textDecoration: "underline" }}
                >
                  Create free account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}