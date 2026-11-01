'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import { priceLabel } from '@/lib/format';
import type { Listing, SectionKey } from '@/lib/types';

import { deleteListings, duplicateListing, moveListing, setListingFlags, type Result } from '../actions';

export function ItemList({ section, items }: { section: SectionKey; items: Listing[] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, start] = useTransition();

  const shown = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())), [items, query]);
  const liveSelected = selected.filter((id) => items.some((item) => item.id === id));
  const searching = Boolean(query.trim());

  const run = (action: () => Promise<Result>, done?: () => void) =>
    start(async () => {
      setMessage('');
      const result = await action();
      if (result.error) setMessage(result.error);
      else done?.();
    });

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return (
    <section className="adm-card">
      <div className="adm-toolbar">
        <input type="search" placeholder="Search by name" aria-label="Search items" value={query} onChange={(e) => setQuery(e.target.value)} />
        <span className="adm-count">{shown.length} of {items.length}</span>
      </div>

      {message ? <p className="adm-alert adm-alert-bad" role="alert">{message}</p> : null}

      {liveSelected.length ? (
        <div className="adm-bulk">
          <b>{liveSelected.length} selected</b>
          <button type="button" className="adm-btn adm-btn-small" disabled={busy} onClick={() => run(() => setListingFlags(liveSelected, { is_published: true }))}>Show</button>
          <button type="button" className="adm-btn adm-btn-small" disabled={busy} onClick={() => run(() => setListingFlags(liveSelected, { is_published: false }))}>Hide</button>
          <button type="button" className="adm-btn adm-btn-small" disabled={busy} onClick={() => run(() => setListingFlags(liveSelected, { is_available: true }))}>Available</button>
          <button type="button" className="adm-btn adm-btn-small" disabled={busy} onClick={() => run(() => setListingFlags(liveSelected, { is_available: false }))}>Not available</button>
          <button
            type="button"
            className={`adm-btn adm-btn-small${confirming === 'bulk' ? ' adm-btn-danger' : ''}`}
            disabled={busy}
            onBlur={() => setConfirming(null)}
            onClick={() => {
              if (confirming !== 'bulk') { setConfirming('bulk'); return; }
              run(() => deleteListings(liveSelected), () => { setSelected([]); setConfirming(null); });
            }}
          >
            {confirming === 'bulk' ? `Press again to delete ${liveSelected.length}` : 'Delete'}
          </button>
        </div>
      ) : null}

      {shown.length === 0 ? <p className="adm-empty">{items.length ? 'Nothing matches that search.' : 'Nothing here yet. Press Add new.'}</p> : null}

      <ul className="adm-items">
        {shown.map((item, index) => (
          <li className={`adm-item${item.is_published ? '' : ' is-hidden'}`} key={item.id}>
            <input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
            <Link className="adm-item-main" href={`/items/${section}/${item.id}`}>
              <span className="adm-thumb">
                {item.photos[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.photos[0].url} alt="" loading="lazy" />
                  : <span>No photo</span>}
              </span>
              <span className="adm-item-text">
                <strong>{item.name}</strong>
                <small>{priceLabel(item)}{item.group_name ? ` · ${item.group_name}` : ''}</small>
              </span>
            </Link>

            <div className="adm-item-flags">
              <button type="button" className={`adm-flag${item.is_published ? ' is-on' : ''}`} disabled={busy} aria-pressed={item.is_published} onClick={() => run(() => setListingFlags([item.id], { is_published: !item.is_published }))}>
                {item.is_published ? 'Showing' : 'Hidden'}
              </button>
              <button type="button" className={`adm-flag${item.is_available ? ' is-on' : ' is-warn'}`} disabled={busy} aria-pressed={item.is_available} onClick={() => run(() => setListingFlags([item.id], { is_available: !item.is_available }))}>
                {item.is_available ? 'Available' : 'Unavailable'}
              </button>
            </div>

            <div className="adm-item-actions">
              <button type="button" className="adm-icon" disabled={busy || searching || index === 0} aria-label={`Move ${item.name} up`} onClick={() => run(() => moveListing(item.id, -1))}>↑</button>
              <button type="button" className="adm-icon" disabled={busy || searching || index === shown.length - 1} aria-label={`Move ${item.name} down`} onClick={() => run(() => moveListing(item.id, 1))}>↓</button>
              <button type="button" className="adm-btn adm-btn-small" disabled={busy} onClick={() => run(() => duplicateListing(item.id))}>Copy</button>
              <button
                type="button"
                className={`adm-btn adm-btn-small${confirming === item.id ? ' adm-btn-danger' : ''}`}
                disabled={busy}
                onBlur={() => setConfirming(null)}
                onClick={() => {
                  if (confirming !== item.id) { setConfirming(item.id); return; }
                  run(() => deleteListings([item.id]), () => setConfirming(null));
                }}
              >
                {confirming === item.id ? 'Press again' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
