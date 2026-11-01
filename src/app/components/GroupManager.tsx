'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { addGroup, deleteGroup, moveGroup, renameGroup, type Result } from '../actions';

export function GroupManager({ groups }: { groups: string[] }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const run = (action: () => Promise<Result>, done?: () => void) =>
    start(async () => {
      setMessage('');
      const result = await action();
      if (result.error) setMessage(result.error);
      else done?.();
    });

  const add = (event: FormEvent) => {
    event.preventDefault();
    run(() => addGroup(name), () => setName(''));
  };

  return (
    <section className="adm-card">
      <h2>Hardware categories</h2>
      <p className="adm-hint">These are the filters customers tap. Deleting one keeps its items, without a category.</p>
      {message ? <p className="adm-alert adm-alert-bad" role="alert">{message}</p> : null}
      <ul className="adm-groups">
        {groups.map((group, index) => (
          <li key={group}>
            <input
              defaultValue={group}
              aria-label={`Rename ${group}`}
              onBlur={(event) => { if (event.target.value.trim() !== group) run(() => renameGroup(group, event.target.value)); }}
            />
            <button type="button" className="adm-icon" disabled={busy || index === 0} aria-label={`Move ${group} up`} onClick={() => run(() => moveGroup(group, -1))}>↑</button>
            <button type="button" className="adm-icon" disabled={busy || index === groups.length - 1} aria-label={`Move ${group} down`} onClick={() => run(() => moveGroup(group, 1))}>↓</button>
            <button
              type="button"
              className={`adm-btn adm-btn-small${confirming === group ? ' adm-btn-danger' : ''}`}
              disabled={busy}
              onBlur={() => setConfirming(null)}
              onClick={() => {
                if (confirming !== group) { setConfirming(group); return; }
                run(() => deleteGroup(group), () => setConfirming(null));
              }}
            >
              {confirming === group ? 'Press again' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
      <form className="adm-add" onSubmit={add}>
        <input placeholder="New category" aria-label="New category" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="adm-btn" disabled={busy}>Add</button>
      </form>
    </section>
  );
}
