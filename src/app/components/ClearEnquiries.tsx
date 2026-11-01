'use client';

import { useState, useTransition } from 'react';

import { clearEnquiries } from '../actions';

export function ClearEnquiries() {
  const [sure, setSure] = useState(false);
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      className={`adm-btn adm-btn-small${sure ? ' adm-btn-danger' : ''}`}
      disabled={busy}
      onClick={() => {
        if (!sure) { setSure(true); return; }
        start(async () => { await clearEnquiries(); setSure(false); });
      }}
      onBlur={() => setSure(false)}
    >
      {sure ? 'Press again to clear all' : 'Clear counts'}
    </button>
  );
}
