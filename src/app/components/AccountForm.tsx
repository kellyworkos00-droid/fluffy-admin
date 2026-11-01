'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { changeEmail, changePassword } from '../actions';

export function AccountForm({ email: initial }: { email: string }) {
  const [email, setEmail] = useState(initial);
  const [emailPassword, setEmailPassword] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [message, setMessage] = useState<{ bad: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  const saveEmail = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    start(async () => {
      const result = await changeEmail(email, emailPassword);
      if (result.error) { setMessage({ bad: true, text: result.error }); return; }
      setEmailPassword('');
      setMessage({ bad: false, text: 'Email updated. Use it next time you sign in.' });
    });
  };

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    if (next !== repeat) { setMessage({ bad: true, text: 'The two new passwords do not match.' }); return; }
    start(async () => {
      const result = await changePassword(current, next);
      if (result.error) { setMessage({ bad: true, text: result.error }); return; }
      setCurrent(''); setNext(''); setRepeat('');
      setMessage({ bad: false, text: 'Password changed.' });
    });
  };

  return (
    <>
      <header className="adm-head"><h1>My account</h1></header>
      {message ? <p className={`adm-alert ${message.bad ? 'adm-alert-bad' : 'adm-alert-good'}`} role={message.bad ? 'alert' : 'status'}>{message.text}</p> : null}

      <form className="adm-card" onSubmit={saveEmail}>
        <h2>Sign-in email</h2>
        <label className="adm-field"><span>Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="adm-field"><span>Password</span>
          <input type="password" autoComplete="current-password" required value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
        </label>
        <button className="adm-btn" disabled={busy}>Update email</button>
      </form>

      <form className="adm-card" onSubmit={savePassword}>
        <h2>Password</h2>
        <label className="adm-field"><span>Current password</span>
          <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="adm-field"><span>New password</span>
          <input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <label className="adm-field"><span>New password again</span>
          <input type="password" autoComplete="new-password" required minLength={10} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </label>
        <button className="adm-btn" disabled={busy}>Change password</button>
      </form>
    </>
  );
}
