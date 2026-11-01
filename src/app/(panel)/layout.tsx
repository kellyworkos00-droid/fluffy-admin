import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Logo } from '@/components/Logo';
import { supabaseServer } from '@/lib/supabase/server';

import { signOut } from '../actions';
import { AdminNav } from '../components/AdminNav';
import '../admin.css';

export const metadata: Metadata = { title: 'Admin | Fluffy Africa', robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: allowed } = await supabase.rpc('is_admin');

  if (!allowed) {
    return (
      <main className="adm-login">
        <div className="adm-login-card">
          <h1>No access</h1>
          <p>This account is not an admin.</p>
          <form action={signOut}><button className="adm-btn adm-btn-wide">Sign out</button></form>
        </div>
      </main>
    );
  }

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <Logo className="adm-side-logo" />
        <AdminNav />
        <div className="adm-side-foot">
          <a href={process.env.NEXT_PUBLIC_SITE_URL ?? '/'} target="_blank" rel="noopener">View the website ↗</a>
          <form action={signOut}><button className="adm-link-btn">Sign out</button></form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
