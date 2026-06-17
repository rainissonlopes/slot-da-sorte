"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/admin");
      } else {
        setCheckingSession(false);
      }
    }
    checkExistingSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Credenciais inválidas"
            : authError.message
        );
      } else if (data.session) {
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#020806] text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-400 font-bold text-sm tracking-wider uppercase">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020806] text-white font-sans flex items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(circle_at_center,#1b4332,transparent_60%)]">
      <div className="w-full max-w-md bg-zinc-950/80 border border-green-500/20 backdrop-blur-xl rounded-[32px] p-8 md:p-10 shadow-[0_0_50px_rgba(0,255,102,0.1)] relative z-10">
        <div className="text-center mb-8">
          <img
            src="/logo.webp"
            alt="Slot da Sorte"
            className="w-[140px] mx-auto mb-6 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          />
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Acesso <span className="text-[#00ff66]">Restrito</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-2 uppercase tracking-widest font-semibold">
            Painel Administrativo
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-950/80 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-xs font-black uppercase text-center tracking-wide">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-400">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 rounded-xl bg-zinc-900/60 border border-zinc-700/60 focus:border-[#00ff66] focus:shadow-[0_0_15px_rgba(0,255,102,0.15)] px-4 outline-none transition-all duration-300 text-sm font-semibold text-white placeholder:text-zinc-600"
              placeholder="admin@slotdasorte.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-400">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-12 rounded-xl bg-zinc-900/60 border border-zinc-700/60 focus:border-[#00ff66] focus:shadow-[0_0_15px_rgba(0,255,102,0.15)] px-4 outline-none transition-all duration-300 text-sm font-semibold text-white placeholder:text-zinc-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#00ff66] hover:bg-white text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,102,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] disabled:opacity-50 transition-all duration-300 flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
