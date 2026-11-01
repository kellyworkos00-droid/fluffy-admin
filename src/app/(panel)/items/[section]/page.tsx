import Link from 'next/link';
import { notFound } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase/server';
import { KIND_OF, SECTION_LABEL, SECTIONS, type Listing, type SectionKey } from '@/lib/types';

import { GroupManager } from '../../../components/GroupManager';
import { ItemList } from '../../../components/ItemList';

export default async function ItemsPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section as SectionKey)) notFound();
  const key = section as SectionKey;

  const supabase = await supabaseServer();
  const [{ data: items }, { data: groups }] = await Promise.all([
    supabase.from('listings').select('*').eq('kind', KIND_OF[key]).order('sort_order').order('created_at'),
    supabase.from('hardware_groups').select('name').order('sort_order'),
  ]);

  return (
    <>
      <header className="adm-head">
        <h1>{SECTION_LABEL[key]}</h1>
        <Link className="adm-btn adm-btn-primary" href={`/items/${key}/new`}>Add new</Link>
      </header>
      <ItemList section={key} items={(items ?? []) as Listing[]} />
      {key === 'hardware' ? <GroupManager groups={(groups ?? []).map((group) => group.name as string)} /> : null}
    </>
  );
}
