'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Overview', short: 'Home' },
  { href: '/items/stays', label: 'Stays', short: 'Stays' },
  { href: '/items/hardware', label: 'Hardware', short: 'Hardware' },
  { href: '/items/cars', label: 'Car Hire', short: 'Cars' },
  { href: '/website', label: 'Website & contact', short: 'Website' },
  { href: '/account', label: 'My account', short: 'Account' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-nav" aria-label="Admin">
      {LINKS.map((link) => {
        const on = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={on ? 'page' : undefined}>
            <span className="adm-nav-long">{link.label}</span>
            <span className="adm-nav-short">{link.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
