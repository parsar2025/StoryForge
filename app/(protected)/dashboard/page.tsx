import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateCharacter } from '@/lib/services/characterProvisioning';
import { buildDashboard } from '@/lib/services/dashboard';
import { DashboardTerminal } from '@/components/dashboard/DashboardTerminal';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const character = await getOrCreateCharacter(user.id, user.email ?? `${user.id}@no-email.local`);
  const data = await buildDashboard(character.id);

  return <DashboardTerminal data={data} />;
}
