'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                       STORYFORGE                            ║
║  Become the protagonist of your own entrepreneurial journey ║
╚══════════════════════════════════════════════════════════════╝
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
      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          {/* ASCII banner */}
          <pre className="text-green-400 text-xs sm:text-sm leading-tight mb-8 whitespace-pre overflow-x-auto">
            {BANNER}
          </pre>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-green-600 text-sm">$ email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="block w-full bg-black border border-green-800 text-green-400 px-3 py-2 mt-1
                           focus:outline-none focus:border-green-500 focus:ring-0
                           placeholder-green-800 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-green-600 text-sm">$ password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full bg-black border border-green-800 text-green-400 px-3 py-2 mt-1
                           focus:outline-none focus:border-green-500 focus:ring-0
                           placeholder-green-800 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm border border-red-900 px-3 py-2">
                ! {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-green-700 text-green-400 px-4 py-2
                         hover:bg-green-950 hover:text-green-300
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-sm transition-colors"
            >
              {loading ? '$ signing_in...' : '$ sign_in'}
            </button>
          </form>

          <div className="mt-8 text-center text-green-900 text-xs">
            Phase 0 - Authentication
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-green-900 px-4 py-2 text-green-800 text-xs text-center">
        STORYFORGE v0.3
      </footer>
    </div>
  );
}
