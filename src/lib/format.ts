export function whatsappLink(number: string, message?: string) {
  return `https://wa.me/${number.replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function priceLabel(item: { price: number | null; unit: string }) {
  return item.price ? `KES ${item.price.toLocaleString('en-KE')}${item.unit ? ` ${item.unit}` : ''}` : 'Ask for price';
}

/** Counts a tap on an enquiry button for the dashboard. Never gets in the customer's way. */
export function trackEnquiry(kind: string, listingId?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  void fetch(`${url}/rest/v1/enquiry_events`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, listing_id: listingId ?? null }),
  }).catch(() => undefined);
}
