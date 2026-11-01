import Link from 'next/link';

import { supabaseServer } from '@/lib/supabase/server';
import type { ListingKind } from '@/lib/types';

import { ClearEnquiries } from '../components/ClearEnquiries';

const KINDS: { kind: ListingKind; label: string; href: string }[] = [
  { kind: 'stay', label: 'Stays', href: '/items/stays' },
  { kind: 'hardware', label: 'Hardware', href: '/items/hardware' },
  { kind: 'car', label: 'Car Hire', href: '/items/cars' },
];

export default async function Overview() {
  const supabase = await supabaseServer();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: listings }, { data: events }, { data: settings }] = await Promise.all([
    supabase.from('listings').select('id, kind, name, photos, is_published, is_available'),
    supabase.from('enquiry_events').select('kind, listing_id').gte('created_at', since),
    supabase.from('site_settings').select('preview').eq('id', 1).single(),
  ]);
  const items = listings ?? [];
  const taps = events ?? [];

  const samples = items.filter((item) => /^sample /i.test(item.name)).length;
  const noPhoto = items.filter((item) => item.is_published && !(item.photos as unknown[]).length).length;
  const noName = new Map(items.map((item) => [item.id, item.name as string]));
  const top = [...taps.reduce((map, tap) => (tap.listing_id ? map.set(tap.listing_id, (map.get(tap.listing_id) ?? 0) + 1) : map), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const todo = [
    samples ? { text: `${samples} sample ${samples === 1 ? 'item' : 'items'} still to replace or delete`, href: '/items/stays' } : null,
    noPhoto ? { text: `${noPhoto} live ${noPhoto === 1 ? 'item has' : 'items have'} no photo`, href: '/items/stays' } : null,
    settings?.preview ? { text: 'The preview notice is still showing on the website', href: '/website' } : null,
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <>
      <header className="adm-head"><h1>Overview</h1></header>

      {todo.length ? (
        <section className="adm-card">
          <h2>To finish the website</h2>
          <ul className="adm-todo">
            {todo.map((item) => <li key={item.text}><Link href={item.href}>{item.text} →</Link></li>)}
          </ul>
        </section>
      ) : null}

      <section className="adm-stats">
        {KINDS.map(({ kind, label, href }) => {
          const ofKind = items.filter((item) => item.kind === kind);
          return (
            <Link className="adm-stat" href={href} key={kind}>
              <strong>{ofKind.filter((item) => item.is_published).length}</strong>
              <span>{label} live</span>
              <small>{ofKind.filter((item) => !item.is_published).length} hidden · {taps.filter((tap) => tap.kind === kind).length} enquiry taps</small>
            </Link>
          );
        })}
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Enquiry taps, last 30 days</h2>
          {taps.length ? <ClearEnquiries /> : null}
        </div>
        <p className="adm-hint">Each tap is a customer pressing a WhatsApp button on an item. It counts interest, not sales.</p>
        {top.length ? (
          <ol className="adm-top">
            {top.map(([id, count]) => <li key={id}><span>{noName.get(id) ?? 'Deleted item'}</span><b>{count}</b></li>)}
          </ol>
        ) : <p className="adm-empty">No taps yet.</p>}
      </section>
    </>
  );
}
