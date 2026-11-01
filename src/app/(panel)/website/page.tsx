import { mergeContent } from '@/lib/content';
import { supabaseServer } from '@/lib/supabase/server';
import type { Settings } from '@/lib/types';

import { WebsiteForm } from '../../components/WebsiteForm';

export default async function WebsitePage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single();
  const settings = { ...data, content: mergeContent(data?.content) } as Settings;
  return <WebsiteForm settings={settings} />;
}
