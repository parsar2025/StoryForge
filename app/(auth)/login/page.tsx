'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BANNER = `
╔══════════════════════════════════════════════════════╗
║                   STORYFORGE                        ║
║  Become the protagonist of your own entrepreneurial ║
║  journey.                                           ║
╚══════════════════════════════════════════════════════╝
`;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-green-400/90 font-mono">
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-xs sm:max-w-sm">
          {/* Centered banner */}
          <div className="flex justify-center mb-12">
            <pre className="text-green-400 text-[10px] sm:text-xs leading-tight whitespace-pre">
              {BANNER}
            </pre>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-green-700 text-xs mb-1.5">$ email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-black border border-green-800 text-green-400 px-3 py-2
                           focus:outline-none focus:border-green-500
                           placeholder-green-800 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-green-700 text-xs mb-1.5">$ password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black border border-green-800 text-green-400 px-3 py-2
                           focus:outline-none focus:border-green-500
                           placeholder-green-800 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs border border-red-900 bg-red-950/20 px-3 py-2">
                ! {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-green-700 text-green-400 px-4 py-2.5
                         hover:bg-green-950 hover:text-green-300
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-sm transition-colors focus:outline-none focus:border-green-500"
            >
              {loading ? '$ signing_in...' : '$ sign_in'}
            </button>
          </form>

          <div className="mt-10 text-center text-green-900 text-[10px] leading-relaxed">
            {`─`.repeat(28)}<br />
            Phase 0 - Authentication
          </div>
        </div>
      </div>

      <footer className="border-t border-green-900 px-4 py-2 text-green-800 text-[10px] text-center">
        STORYFORGE v0.3
      </footer>
    </div>
  );
}
