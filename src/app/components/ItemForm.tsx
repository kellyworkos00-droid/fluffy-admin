'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';

import { KIND_OF, SECTION_LABEL, type Listing, type Photo, type SectionKey } from '@/lib/types';

import { saveListing } from '../actions';
import { uploadImage } from './photos';

const UNITS: Record<SectionKey, string> = { stays: 'per night', hardware: 'each', cars: 'per day' };
const DETAIL_HINT: Record<SectionKey, string> = { stays: 'For example: 2 bedrooms · sleeps 4', hardware: '', cars: 'For example: Town trips · 5 seats' };

export function ItemForm({ section, item, groups }: { section: SectionKey; item: Listing | null; groups: string[] }) {
  const router = useRouter();
  const [draftId] = useState(() => item?.id ?? crypto.randomUUID());
  const [name, setName] = useState(item?.name ?? '');
  const [detail, setDetail] = useState(item?.detail ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [group, setGroup] = useState(item?.group_name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? UNITS[section]);
  const [price, setPrice] = useState(item?.price?.toString() ?? '');
  const [photos, setPhotos] = useState<Photo[]>(item?.photos ?? []);
  const [removed, setRemoved] = useState<string[]>([]);
  const [published, setPublished] = useState(item?.is_published ?? true);
  const [available, setAvailable] = useState(item?.is_available ?? true);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    setError('');
    setSaved(false);
    setUploading((count) => count + files.length);
    for (const file of files) {
      try {
        const photo = await uploadImage(file, `listings/${draftId}`);
        setPhotos((current) => [...current, photo]);
      } catch (failure) {
        console.error('[admin] upload:', failure);
        setError(`${file.name} did not upload. ${failure instanceof Error ? failure.message : 'Try again.'}`);
      } finally {
        setUploading((count) => count - 1);
      }
    }
  };

  const movePhoto = (index: number, to: number) => {
    setSaved(false);
    setPhotos((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const removePhoto = (photo: Photo) => {
    setSaved(false);
    setPhotos((current) => current.filter((value) => value.path !== photo.path));
    setRemoved((current) => [...current, photo.path]);
  };

  const submit = (event: FormEvent, leave: boolean) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    const parsed = price.trim() === '' ? null : Number(price.replace(/[,\s]/g, ''));
    if (parsed !== null && Number.isNaN(parsed)) { setError('Price must be a number, for example 4500.'); return; }

    start(async () => {
      const result = await saveListing(
        {
          id: draftId,
          kind: KIND_OF[section],
          name,
          detail,
          description,
          group_name: section === 'hardware' ? group || null : null,
          unit,
          price: parsed,
          photos,
          is_published: published,
          is_available: available,
        },
        removed
      );
      if (result.error) { setError(result.error); return; }
      setRemoved([]);
      if (leave) {
        router.push(`/items/${section}`);
        router.refresh();
      } else {
        setSaved(true);
      }
    });
  };

  return (
    <form onSubmit={(event) => submit(event, true)}>
      <header className="adm-head">
        <div>
          <Link className="adm-back" href={`/items/${section}`}>← {SECTION_LABEL[section]}</Link>
          <h1>{item ? 'Edit item' : 'Add new'}</h1>
        </div>
      </header>

      {error ? <p className="adm-alert adm-alert-bad" role="alert">{error}</p> : null}
      {saved ? <p className="adm-alert adm-alert-good" role="status">Saved. The website is updated.</p> : null}

      <section className="adm-card">
        <h2>Photos</h2>
        <p className="adm-hint">The first photo is the main one. Photos are made smaller automatically, so large ones are fine.</p>
        <div className="adm-photos">
          {photos.map((photo, index) => (
            <figure key={photo.path} className="adm-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`Photo ${index + 1}`} />
              {index === 0 ? <figcaption>Main</figcaption> : null}
              <div className="adm-photo-actions">
                <button type="button" aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0} onClick={() => movePhoto(index, index - 1)}>←</button>
                {index > 0 ? <button type="button" onClick={() => movePhoto(index, 0)}>Make main</button> : null}
                <button type="button" aria-label={`Move photo ${index + 1} later`} disabled={index === photos.length - 1} onClick={() => movePhoto(index, index + 1)}>→</button>
                <button type="button" className="is-remove" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(photo)}>×</button>
              </div>
            </figure>
          ))}
          <button type="button" className="adm-photo-add" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
            {uploading ? `Uploading ${uploading}…` : '+ Add photos'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => void addPhotos(event)} />
        </div>
      </section>

      <section className="adm-card adm-form-grid">
        <h2>Details</h2>
        <label className="adm-field adm-span"><span>Name</span>
          <input required value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        </label>
        {section === 'hardware' ? (
          <label className="adm-field"><span>Category</span>
            <select value={group} onChange={(e) => { setGroup(e.target.value); setSaved(false); }}>
              <option value="">No category</option>
              {groups.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        ) : (
          <label className="adm-field adm-span"><span>Short detail</span>
            <input placeholder={DETAIL_HINT[section]} value={detail} onChange={(e) => { setDetail(e.target.value); setSaved(false); }} />
          </label>
        )}
        <label className="adm-field"><span>Price in KES</span>
          <input inputMode="numeric" placeholder="Empty shows “Ask for price”" value={price} onChange={(e) => { setPrice(e.target.value); setSaved(false); }} />
        </label>
        <label className="adm-field"><span>Price is</span>
          <input placeholder={UNITS[section]} value={unit} onChange={(e) => { setUnit(e.target.value); setSaved(false); }} />
        </label>
        <label className="adm-field adm-span"><span>Description</span>
          <textarea rows={5} value={description} onChange={(e) => { setDescription(e.target.value); setSaved(false); }} />
        </label>
      </section>

      <section className="adm-card">
        <h2>On the website</h2>
        <label className="adm-switch">
          <input type="checkbox" checked={published} onChange={(e) => { setPublished(e.target.checked); setSaved(false); }} />
          <span><b>Show on the website</b><small>Off hides it from customers but keeps it here.</small></span>
        </label>
        <label className="adm-switch">
          <input type="checkbox" checked={available} onChange={(e) => { setAvailable(e.target.checked); setSaved(false); }} />
          <span><b>Available now</b><small>Off stays visible but customers cannot book or order it.</small></span>
        </label>
      </section>

      <div className="adm-savebar">
        <button className="adm-btn adm-btn-primary" disabled={busy || uploading > 0}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="adm-btn" disabled={busy || uploading > 0} onClick={(event) => submit(event, false)}>Save and keep editing</button>
      </div>
    </form>
  );
}
