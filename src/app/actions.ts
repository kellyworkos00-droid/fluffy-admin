'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase/server';
import type { Content, ListingKind, Photo } from '@/lib/types';

export type Result = { error?: string; ok?: boolean };

const BUCKET = 'site-images';

/** Every action starts here. The database rules enforce the same thing a second time. */
async function admin() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: allowed } = await supabase.rpc('is_admin');
  if (!allowed) throw new Error('This account is not an admin.');
  return { supabase, user };
}

/**
 * Tells the public site to show the change now. If it cannot be reached the save
 * still stands, and the site catches up by itself within five minutes.
 */
async function refresh() {
  revalidatePath('/', 'layout');
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!site || !secret) {
    console.error('[admin] NEXT_PUBLIC_SITE_URL or REVALIDATE_SECRET is not set, so the website refreshes on its own schedule.');
    return;
  }
  try {
    const response = await fetch(`${site.replace(/\/$/, '')}/api/revalidate`, { method: 'POST', headers: { 'x-revalidate-secret': secret }, cache: 'no-store' });
    if (!response.ok) console.error('[admin] website refresh refused:', response.status);
  } catch (error) {
    console.error('[admin] website refresh failed:', error instanceof Error ? error.message : error);
  }
}

const fail = (context: string, message: string): Result => {
  console.error(`[admin] ${context}:`, message);
  return { error: message };
};

export type ListingInput = {
  id?: string;
  kind: ListingKind;
  name: string;
  detail: string;
  description: string;
  group_name: string | null;
  unit: string;
  price: number | null;
  photos: Photo[];
  is_published: boolean;
  is_available: boolean;
};

export async function saveListing(input: ListingInput, removedPaths: string[]): Promise<Result> {
  const { supabase } = await admin();
  if (!input.name.trim()) return { error: 'Give this item a name.' };
  if (input.price !== null && (!Number.isInteger(input.price) || input.price < 0)) return { error: 'Price must be a whole number of shillings.' };

  const row = { ...input, name: input.name.trim(), updated_at: new Date().toISOString() };
  let error;
  if (input.id && (await supabase.from('listings').select('id').eq('id', input.id).maybeSingle()).data) {
    ({ error } = await supabase.from('listings').update(row).eq('id', input.id));
  } else {
    const { data: last } = await supabase.from('listings').select('sort_order').eq('kind', input.kind).order('sort_order', { ascending: false }).limit(1).maybeSingle();
    ({ error } = await supabase.from('listings').insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 }));
  }
  if (error) return fail('save listing', error.message);

  if (removedPaths.length) {
    const removed = await supabase.storage.from(BUCKET).remove(removedPaths);
    if (removed.error) console.error('[admin] remove photos:', removed.error.message);
  }
  await refresh();
  return { ok: true };
}

export async function setListingFlags(ids: string[], patch: { is_published?: boolean; is_available?: boolean }): Promise<Result> {
  const { supabase } = await admin();
  const { error } = await supabase.from('listings').update({ ...patch, updated_at: new Date().toISOString() }).in('id', ids);
  if (error) return fail('update listings', error.message);
  await refresh();
  return { ok: true };
}

export async function deleteListings(ids: string[]): Promise<Result> {
  const { supabase } = await admin();
  const { data: rows } = await supabase.from('listings').select('photos').in('id', ids);
  const { error } = await supabase.from('listings').delete().in('id', ids);
  if (error) return fail('delete listings', error.message);
  const paths = (rows ?? []).flatMap((row) => (row.photos as Photo[]).map((photo) => photo.path));
  if (paths.length) {
    const removed = await supabase.storage.from(BUCKET).remove(paths);
    if (removed.error) console.error('[admin] remove photos:', removed.error.message);
  }
  await refresh();
  return { ok: true };
}

export async function moveListing(id: string, direction: -1 | 1): Promise<Result> {
  const { supabase } = await admin();
  const { data: current } = await supabase.from('listings').select('kind').eq('id', id).single();
  if (!current) return { error: 'That item no longer exists.' };
  const { data: rows } = await supabase.from('listings').select('id').eq('kind', current.kind).order('sort_order').order('created_at');
  const order = (rows ?? []).map((row) => row.id as string);
  const from = order.indexOf(id);
  const to = from + direction;
  if (to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];
  const results = await Promise.all(order.map((rowId, index) => supabase.from('listings').update({ sort_order: index + 1 }).eq('id', rowId)));
  const failed = results.find((result) => result.error);
  if (failed?.error) return fail('reorder', failed.error.message);
  await refresh();
  return { ok: true };
}

export async function duplicateListing(id: string): Promise<Result> {
  const { supabase } = await admin();
  const { data: source, error } = await supabase.from('listings').select('*').eq('id', id).single();
  if (error || !source) return fail('duplicate', error?.message ?? 'Item not found');

  const copyId = crypto.randomUUID();
  const photos: Photo[] = [];
  for (const photo of source.photos as Photo[]) {
    const path = `listings/${copyId}/${photo.path.split('/').pop()}`;
    const copied = await supabase.storage.from(BUCKET).copy(photo.path, path);
    if (copied.error) return fail('copy photo', copied.error.message);
    photos.push({ path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
  }

  const { id: _id, created_at: _created, updated_at: _updated, ...rest } = source;
  const inserted = await supabase.from('listings').insert({ ...rest, id: copyId, name: `${source.name} (copy)`, photos, is_published: false, sort_order: source.sort_order + 1 });
  if (inserted.error) return fail('duplicate', inserted.error.message);
  await refresh();
  return { ok: true };
}

export type SettingsInput = {
  business_name: string;
  city: string;
  whatsapp: string;
  phone_display: string;
  email: string;
  location: string;
  opening_hours: string;
  tiktok: string;
  instagram: string;
  facebook: string;
  logo_url: string | null;
  logo_path: string | null;
  preview: boolean;
  content: Content;
};

export async function saveSettings(input: SettingsInput): Promise<Result> {
  const { supabase } = await admin();
  const whatsapp = input.whatsapp.replace(/\D/g, '');
  if (!/^254\d{9}$/.test(whatsapp)) return { error: 'WhatsApp number must look like 254715026069. Every order goes to this number.' };
  if (!input.business_name.trim()) return { error: 'Business name cannot be empty.' };

  const { data: before } = await supabase.from('site_settings').select('logo_path').eq('id', 1).single();
  const { error } = await supabase.from('site_settings').update({ ...input, whatsapp, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) return fail('save settings', error.message);
  if (before?.logo_path && before.logo_path !== input.logo_path) await supabase.storage.from(BUCKET).remove([before.logo_path]);
  await refresh();
  return { ok: true };
}

export async function addGroup(name: string): Promise<Result> {
  const { supabase } = await admin();
  const clean = name.trim();
  if (!clean) return { error: 'Type a name first.' };
  const { data: last } = await supabase.from('hardware_groups').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from('hardware_groups').insert({ name: clean, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return error.code === '23505' ? { error: 'You already have that category.' } : fail('add group', error.message);
  await refresh();
  return { ok: true };
}

export async function renameGroup(from: string, to: string): Promise<Result> {
  const { supabase } = await admin();
  const clean = to.trim();
  if (!clean) return { error: 'A category needs a name.' };
  if (clean === from) return { ok: true };
  const { error } = await supabase.from('hardware_groups').update({ name: clean }).eq('name', from);
  if (error) return error.code === '23505' ? { error: 'You already have that category.' } : fail('rename group', error.message);
  const moved = await supabase.from('listings').update({ group_name: clean }).eq('kind', 'hardware').eq('group_name', from);
  if (moved.error) return fail('rename group items', moved.error.message);
  await refresh();
  return { ok: true };
}

/** The items stay, without a category, so nothing disappears from the shop. */
export async function deleteGroup(name: string): Promise<Result> {
  const { supabase } = await admin();
  const moved = await supabase.from('listings').update({ group_name: null }).eq('kind', 'hardware').eq('group_name', name);
  if (moved.error) return fail('clear group items', moved.error.message);
  const { error } = await supabase.from('hardware_groups').delete().eq('name', name);
  if (error) return fail('delete group', error.message);
  await refresh();
  return { ok: true };
}

export async function moveGroup(name: string, direction: -1 | 1): Promise<Result> {
  const { supabase } = await admin();
  const { data: rows } = await supabase.from('hardware_groups').select('name').order('sort_order');
  const order = (rows ?? []).map((row) => row.name as string);
  const from = order.indexOf(name);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return { ok: true };
  [order[from], order[to]] = [order[to], order[from]];
  await Promise.all(order.map((groupName, index) => supabase.from('hardware_groups').update({ sort_order: index + 1 }).eq('name', groupName)));
  await refresh();
  return { ok: true };
}

export async function clearEnquiries(): Promise<Result> {
  const { supabase } = await admin();
  const { error } = await supabase.from('enquiry_events').delete().gte('id', 0);
  if (error) return fail('clear enquiries', error.message);
  revalidatePath('/');
  return { ok: true };
}

export async function changeEmail(email: string, password: string): Promise<Result> {
  const { supabase, user } = await admin();
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: 'That does not look like an email address.' };
  const checked = await supabase.auth.signInWithPassword({ email: user.email ?? '', password });
  if (checked.error) return { error: 'Your password is not right.' };
  const { error } = await supabase.rpc('change_admin_email', { new_email: clean });
  if (error) return error.code === '23505' ? { error: 'Another account already uses that email.' } : fail('change email', error.message);
  return { ok: true };
}

export async function changePassword(current: string, next: string): Promise<Result> {
  const { supabase, user } = await admin();
  if (next.length < 10) return { error: 'Use at least 10 characters for the new password.' };
  const checked = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: current });
  if (checked.error) return { error: 'Your current password is not right.' };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return fail('change password', error.message);
  return { ok: true };
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
