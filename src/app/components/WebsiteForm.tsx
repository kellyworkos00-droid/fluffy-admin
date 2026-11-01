'use client';

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';

import { SECTION_LABEL, SECTIONS, type Content, type Settings } from '@/lib/types';

import { saveSettings } from '../actions';
import { uploadImage } from './photos';

type Tab = 'contact' | 'home' | 'pages' | 'brand';
const TABS: { key: Tab; label: string }[] = [
  { key: 'contact', label: 'Contact' },
  { key: 'home', label: 'Home page' },
  { key: 'pages', label: 'Other pages' },
  { key: 'brand', label: 'Logo & search' },
];

function Field({ label, value, onChange, hint, rows, span }: { label: string; value: string; onChange: (value: string) => void; hint?: string; rows?: number; span?: boolean }) {
  return (
    <label className={`adm-field${span ? ' adm-span' : ''}`}>
      <span>{label}</span>
      {rows ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function WebsiteForm({ settings }: { settings: Settings }) {
  const [form, setForm] = useState(settings);
  const [tab, setTab] = useState<Tab>('contact');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, start] = useTransition();

  const set = (patch: Partial<Settings>) => { setForm((current) => ({ ...current, ...patch })); setSaved(false); };
  const setContent = (change: (content: Content) => Content) => { setForm((current) => ({ ...current, content: change(current.content) })); setSaved(false); };
  const c = form.content;

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const photo = await uploadImage(file, 'brand', 1200);
      set({ logo_url: photo.url, logo_path: photo.path });
    } catch (failure) {
      console.error('[admin] logo upload:', failure);
      setError(`The logo did not upload. ${failure instanceof Error ? failure.message : 'Try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    start(async () => {
      const result = await saveSettings(form);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  };

  return (
    <form onSubmit={submit}>
      <header className="adm-head"><h1>Website & contact</h1></header>

      <div className="adm-tabs" role="tablist">
        {TABS.map((item) => (
          <button type="button" role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'is-on' : ''} key={item.key} onClick={() => setTab(item.key)}>{item.label}</button>
        ))}
      </div>

      {error ? <p className="adm-alert adm-alert-bad" role="alert">{error}</p> : null}
      {saved ? <p className="adm-alert adm-alert-good" role="status">Saved. The website is updated.</p> : null}

      {tab === 'contact' ? (
        <>
          <section className="adm-card adm-form-grid">
            <h2>Business</h2>
            <Field label="Business name" value={form.business_name} onChange={(business_name) => set({ business_name })} />
            <Field label="Town" value={form.city} onChange={(city) => set({ city })} />
            <Field label="WhatsApp number" value={form.whatsapp} onChange={(whatsapp) => set({ whatsapp })} hint="Every order goes here. Start with 254, for example 254715026069." />
            <Field label="Phone number to show" value={form.phone_display} onChange={(phone_display) => set({ phone_display })} />
            <Field label="Email" value={form.email} onChange={(email) => set({ email })} hint="Leave empty to hide it." />
            <Field label="Location" value={form.location} onChange={(location) => set({ location })} hint="Shown in the footer." />
            <Field label="Opening hours" rows={3} span value={form.opening_hours} onChange={(opening_hours) => set({ opening_hours })} />
          </section>
          <section className="adm-card adm-form-grid">
            <h2>Social media</h2>
            <p className="adm-hint adm-span">Type only the username. Leave empty to hide the link.</p>
            <Field label="TikTok" value={form.tiktok} onChange={(tiktok) => set({ tiktok })} />
            <Field label="Instagram" value={form.instagram} onChange={(instagram) => set({ instagram })} />
            <Field label="Facebook" value={form.facebook} onChange={(facebook) => set({ facebook })} />
          </section>
          <section className="adm-card">
            <h2>Preview notice</h2>
            <label className="adm-switch">
              <input type="checkbox" checked={form.preview} onChange={(e) => set({ preview: e.target.checked })} />
              <span><b>Show the “Preview” notice</b><small>Turn this off when the real items are in.</small></span>
            </label>
          </section>
        </>
      ) : null}

      {tab === 'home' ? (
        <>
          <section className="adm-card adm-form-grid">
            <h2>First screen</h2>
            <Field label="Headline" span value={c.hero.title} onChange={(title) => setContent((v) => ({ ...v, hero: { ...v.hero, title } }))} />
            <Field label="Line under it" span value={c.hero.text} onChange={(text) => setContent((v) => ({ ...v, hero: { ...v.hero, text } }))} />
            <Field label="WhatsApp button" span value={c.hero.cta} onChange={(cta) => setContent((v) => ({ ...v, hero: { ...v.hero, cta } }))} />
          </section>

          {SECTIONS.map((key) => (
            <section className="adm-card adm-form-grid" key={key}>
              <h2>{SECTION_LABEL[key]}</h2>
              <label className="adm-switch adm-span">
                <input type="checkbox" checked={c.sections[key]} onChange={(e) => setContent((v) => ({ ...v, sections: { ...v.sections, [key]: e.target.checked } }))} />
                <span><b>Show this business on the website</b><small>Off removes its page, menu link and home section.</small></span>
              </label>
              <Field label="Link word" value={c.doors[key].word} onChange={(word) => setContent((v) => ({ ...v, doors: { ...v.doors, [key]: { ...v.doors[key], word } } }))} hint="The big word on the first screen." />
              <Field label="Link action" value={c.doors[key].action} onChange={(action) => setContent((v) => ({ ...v, doors: { ...v.doors, [key]: { ...v.doors[key], action } } }))} />
              <Field label="Small label" value={c.chapters[key].eyebrow} onChange={(eyebrow) => setContent((v) => ({ ...v, chapters: { ...v.chapters, [key]: { ...v.chapters[key], eyebrow } } }))} />
              <Field label="Button" value={c.chapters[key].cta} onChange={(cta) => setContent((v) => ({ ...v, chapters: { ...v.chapters, [key]: { ...v.chapters[key], cta } } }))} />
              <Field label="Heading" span value={c.chapters[key].title} onChange={(title) => setContent((v) => ({ ...v, chapters: { ...v.chapters, [key]: { ...v.chapters[key], title } } }))} />
              <Field label="Text" span rows={3} value={c.chapters[key].body} onChange={(body) => setContent((v) => ({ ...v, chapters: { ...v.chapters, [key]: { ...v.chapters[key], body } } }))} />
            </section>
          ))}

          <section className="adm-card adm-form-grid">
            <h2>Last section</h2>
            <Field label="Heading" span value={c.closing.title} onChange={(title) => setContent((v) => ({ ...v, closing: { ...v.closing, title } }))} />
            <Field label="Text" span rows={2} value={c.closing.body} onChange={(body) => setContent((v) => ({ ...v, closing: { ...v.closing, body } }))} />
            <Field label="WhatsApp button" span value={c.closing.cta} onChange={(cta) => setContent((v) => ({ ...v, closing: { ...v.closing, cta } }))} />
          </section>
        </>
      ) : null}

      {tab === 'pages' ? SECTIONS.map((key) => (
        <section className="adm-card adm-form-grid" key={key}>
          <h2>{SECTION_LABEL[key]} page</h2>
          <Field label="Heading" span value={c.pages[key].title} onChange={(title) => setContent((v) => ({ ...v, pages: { ...v.pages, [key]: { ...v.pages[key], title } } }))} />
          <Field label="Text under it" span rows={2} value={c.pages[key].intro} onChange={(intro) => setContent((v) => ({ ...v, pages: { ...v.pages, [key]: { ...v.pages[key], intro } } }))} />
          <Field
            label="How it works"
            span
            rows={4}
            hint="One step on each line. Leave empty to hide this part."
            value={c.pages[key].steps.join('\n')}
            onChange={(text) => setContent((v) => ({ ...v, pages: { ...v.pages, [key]: { ...v.pages[key], steps: text.split('\n') } } }))}
          />
        </section>
      )) : null}

      {tab === 'brand' ? (
        <>
          <section className="adm-card">
            <h2>Logo</h2>
            <p className="adm-hint">Use a transparent PNG or an SVG. With no upload, the site uses the Fluffy Africa logo designed for it.</p>
            {form.logo_url ? (
              <div className="adm-logo-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logo_url} alt="Current logo" />
              </div>
            ) : <p className="adm-empty">Using the built-in logo.</p>}
            <div className="adm-row">
              <label className="adm-btn">
                {uploading ? 'Uploading…' : 'Upload a logo'}
                <input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden disabled={uploading} onChange={(event) => void uploadLogo(event)} />
              </label>
              {form.logo_url ? <button type="button" className="adm-btn" onClick={() => set({ logo_url: null, logo_path: null })}>Use the built-in logo</button> : null}
            </div>
          </section>
          <section className="adm-card adm-form-grid">
            <h2>Google and link previews</h2>
            <Field label="Page title" span value={c.seo.title} onChange={(title) => setContent((v) => ({ ...v, seo: { ...v.seo, title } }))} />
            <Field label="Description" span rows={3} value={c.seo.description} onChange={(description) => setContent((v) => ({ ...v, seo: { ...v.seo, description } }))} />
          </section>
        </>
      ) : null}

      <div className="adm-savebar">
        <button className="adm-btn adm-btn-primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save changes'}</button>
      </div>
    </form>
  );
}
