import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';

import type { Content, Listing, ListingKind, Settings } from './types';

export const DEFAULT_CONTENT: Content = {
  hero: {
    title: 'Stays, hardware and car hire in Kisumu.',
    text: 'Get a price on WhatsApp before you commit. No account needed.',
    cta: 'Chat with us on WhatsApp',
  },
  sections: { stays: true, hardware: true, cars: true },
  doors: {
    stays: { word: 'Stay', action: 'Book a place' },
    hardware: { word: 'Build', action: 'Order now' },
    cars: { word: 'Drive', action: 'Hire a car' },
  },
  chapters: {
    stays: { eyebrow: 'Stays', title: 'Somewhere good to sleep.', body: 'Pick a place, choose your dates and send them to us. We confirm the price and availability on WhatsApp.', cta: 'See the stays' },
    hardware: { eyebrow: 'Hardware', title: 'Everything for the build.', body: 'Put your whole list together in one place and send it as a single order, from cement to the last tap.', cta: 'Start an order' },
    cars: { eyebrow: 'Car Hire', title: 'The keys, when you need them.', body: 'A town errand or a longer trip. Tell us your dates and we send a quote.', cta: 'See the cars' },
  },
  closing: {
    title: 'Tell us what you need.',
    body: 'No call centre and no waiting in a queue. You talk straight to us.',
    cta: 'Message us on WhatsApp',
  },
  pages: {
    stays: { title: 'Find a place to stay.', intro: 'Add your dates, tap a place and your message is written for you.', steps: ['Add your dates and guests.', 'Tap Book on the place you like.', 'We reply on WhatsApp with the price and availability.'] },
    hardware: { title: 'Build your order.', intro: 'Add everything you need, then send the whole list in one message.', steps: ['Add what you need to your order.', 'Check the quantities and send it on WhatsApp.', 'We confirm the total and how you get it.'] },
    cars: { title: 'Hire a car.', intro: 'Add your trip dates, pick a car and we send you a quote.', steps: ['Add your pick up and return dates.', 'Tap the car that suits your trip.', 'We reply on WhatsApp with a quote.'] },
  },
  seo: {
    title: 'Fluffy Africa | Stays, Hardware and Car Hire in Kisumu',
    description: 'Book a stay, order hardware or hire a car in Kisumu. Everything is arranged directly with Fluffy Africa on WhatsApp.',
  },
};

const DEFAULT_SETTINGS: Settings = {
  business_name: 'Fluffy Africa',
  city: 'Kisumu',
  whatsapp: '254715026069',
  phone_display: '0715 026 069',
  email: '',
  location: '',
  opening_hours: '',
  tiktok: 'fluffyafrica254',
  instagram: '',
  facebook: '',
  logo_url: null,
  logo_path: null,
  preview: true,
  content: DEFAULT_CONTENT,
};

/** Saved wording over the defaults, so a field added later is never blank on the site. */
export function mergeContent(saved: unknown): Content {
  const merge = (base: unknown, over: unknown): unknown => {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base && typeof base === 'object') {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(base)) {
        result[key] = merge((base as Record<string, unknown>)[key], (over as Record<string, unknown> | null | undefined)?.[key]);
      }
      return result;
    }
    return over === undefined || over === null ? base : over;
  };
  return merge(DEFAULT_CONTENT, saved) as Content;
}

const client = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
};

export const getSettings = cache(async (): Promise<Settings> => {
  const { data, error } = (await client()?.from('site_settings').select('*').eq('id', 1).single()) ?? {};
  if (error) console.error('Could not load site settings:', error.message);
  if (!data) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...data, content: mergeContent(data.content) } as Settings;
});

export const getListings = cache(async (kind: ListingKind): Promise<Listing[]> => {
  const { data, error } = (await client()?.from('listings').select('*').eq('kind', kind).eq('is_published', true).order('sort_order')) ?? {};
  if (error) console.error('Could not load listings:', error.message);
  return (data ?? []) as Listing[];
});

export const getGroups = cache(async (): Promise<string[]> => {
  const { data, error } = (await client()?.from('hardware_groups').select('name').order('sort_order')) ?? {};
  if (error) console.error('Could not load hardware groups:', error.message);
  return (data ?? []).map((row: { name: string }) => row.name);
});
