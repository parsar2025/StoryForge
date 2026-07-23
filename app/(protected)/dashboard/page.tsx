import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCharacter } from '@/lib/services/characterProvisioning';
import { buildDashboard } from '@/lib/services/dashboard';
import { Button } from '@/components/ui/button';
import { CharacterHeader } from '@/components/dashboard/CharacterHeader';
import { FocusSignalBanner } from '@/components/dashboard/FocusSignalBanner';
import { LoggingReminder } from '@/components/dashboard/LoggingReminder';
import { TreeGroup } from '@/components/dashboard/TreeGroup';
import { QuestList } from '@/components/dashboard/QuestList';
import { TypewriterDemo } from '@/components/dashboard/TypewriterDemo';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Server component renders from one aggregate call (Requirement 1.1).
  const character = await getOrCreateCharacter(user.id, user.email ?? `${user.id}@no-email.local`);
  const data = await buildDashboard(character.id);

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">StoryForge</h1>
          <form action="/api/auth/sign-out" method="post">
            <Button type="submit" variant="outline">
              Sign Out
            </Button>
          </form>
        </div>

        <section className="rounded-lg border border-border bg-card p-6">
          <CharacterHeader character={data.character} statusEffects={data.statusEffects} />
        </section>

        <div className="space-y-3">
          <FocusSignalBanner focusSignal={data.focusSignal} />
          <LoggingReminder loggedToday={data.loggedToday} />
        </div>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Daily Briefing</h2>
          <TypewriterDemo />
        </section>

        <section className="grid gap-8 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
          <TreeGroup title="Core" trees={data.trees.core} />
          <TreeGroup title="Support" trees={data.trees.support} />
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Quests</h2>
          <QuestList quests={data.quests} />
        </section>
      </div>
    </div>
  );
}
