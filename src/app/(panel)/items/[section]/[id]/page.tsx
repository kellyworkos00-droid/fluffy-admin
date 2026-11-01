import { notFound } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase/server';
import { SECTIONS, type Listing, type SectionKey } from '@/lib/types';

import { ItemForm } from '../../../../components/ItemForm';

export default async function ItemPage({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  if (!SECTIONS.includes(section as SectionKey)) notFound();

  const supabase = await supabaseServer();
  const { data: groups } = await supabase.from('hardware_groups').select('name').order('sort_order');
  let item: Listing | null = null;
  if (id !== 'new') {
    const { data } = await supabase.from('listings').select('*').eq('id', id).maybeSingle();
    if (!data) notFound();
    item = data as Listing;
  }

  return <ItemForm section={section as SectionKey} item={item} groups={(groups ?? []).map((group) => group.name as string)} />;
}
