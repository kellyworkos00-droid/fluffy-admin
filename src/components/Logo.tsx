import { LOGO_AFRICA, LOGO_VIEWBOX, LOGO_WORD } from './logo-paths';

export function Logo({ className, src, alt = 'Fluffy Africa' }: { className?: string; src?: string | null; alt?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={src} alt={alt} />;
  }
  return (
    <svg className={className} viewBox={LOGO_VIEWBOX} role="img" aria-label={alt} fill="currentColor">
      <path d={LOGO_WORD} />
      <path d={LOGO_AFRICA} />
    </svg>
  );
}
