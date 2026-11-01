export type ListingKind = 'stay' | 'hardware' | 'car';
export type SectionKey = 'stays' | 'hardware' | 'cars';

export const KIND_OF: Record<SectionKey, ListingKind> = { stays: 'stay', hardware: 'hardware', cars: 'car' };
export const SECTION_LABEL: Record<SectionKey, string> = { stays: 'Stays', hardware: 'Hardware', cars: 'Car Hire' };
export const SECTION_PATH: Record<SectionKey, string> = { stays: '/stays', hardware: '/hardware', cars: '/car-hire' };
export const SECTIONS: SectionKey[] = ['stays', 'hardware', 'cars'];

export type Photo = { url: string; path: string };

export type Listing = {
  id: string;
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
  sort_order: number;
};

export type Chapter = { eyebrow: string; title: string; body: string; cta: string };
export type PageCopy = { title: string; intro: string; steps: string[] };
export type Door = { word: string; action: string };

export type Content = {
  hero: { title: string; text: string; cta: string };
  sections: Record<SectionKey, boolean>;
  doors: Record<SectionKey, Door>;
  chapters: Record<SectionKey, Chapter>;
  closing: { title: string; body: string; cta: string };
  pages: Record<SectionKey, PageCopy>;
  seo: { title: string; description: string };
};

export type Settings = {
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
