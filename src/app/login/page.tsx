'use client';

import { useState, type FormEvent } from 'react';

import { Logo } from '@/components/Logo';
import { supabaseBrowser } from '@/lib/supabase/browser';

import '../admin.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: failed } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (failed) {
      setBusy(false);
      setError(/invalid/i.test(failed.message) ? 'That email or password is not right.' : 'We could not sign you in. Check your connection and try again.');
      return;
    }
    // A full load, so the server sees the new session.
    window.location.assign('/');
  };

  return (
    <main className="adm-login">
      <form className="adm-login-card" onSubmit={(event) => void submit(event)}>
        <Logo className="adm-login-logo" />
        <h1>Admin</h1>
        {error ? <p className="adm-alert adm-alert-bad" role="alert">{error}</p> : null}
        <label className="adm-field"><span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="adm-field"><span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="adm-btn adm-btn-primary adm-btn-wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
