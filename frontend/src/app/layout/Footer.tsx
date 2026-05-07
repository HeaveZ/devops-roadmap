import { env } from 'shared/config/env';

export function Footer() {
  return (
    <footer className="mt-16 py-6 text-center text-muted/80 text-xs border-t border-white/5">
      created by HeaveZ :){' '}
      <span className="ml-3 opacity-50">v{env.appVersion}</span>
    </footer>
  );
}
