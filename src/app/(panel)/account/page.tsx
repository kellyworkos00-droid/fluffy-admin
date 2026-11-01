import { supabaseServer } from '@/lib/supabase/server';

import { AccountForm } from '../../components/AccountForm';

export default async function AccountPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return <AccountForm email={user?.email ?? ''} />;
}
