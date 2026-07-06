import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-primary">StoryForge</h1>
            <p className="text-muted-foreground mt-1">Dashboard</p>
          </div>
          <form action="/api/auth/sign-out" method="post">
            <Button type="submit" variant="outline">
              Sign Out
            </Button>
          </form>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Phase 0 Dashboard Shell</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Logged in as:</p>
              <p className="text-lg font-mono">{user.email}</p>
            </div>
            <div className="mt-6 p-4 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                ✅ Authentication is working! This is an empty dashboard shell for Phase 0.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Future phases will add: skill trees, quests, AI briefings, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
