import { useMemo } from 'react';
import { useAppRouter } from './router-context';

export function usePathname(): string {
  const { pathname } = useAppRouter();
  return pathname;
}

export function useRouter() {
  const { navigate, replace, back } = useAppRouter();
  return useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => replace(href),
      back: () => back(),
      prefetch: () => {},
      refresh: () => {},
    }),
    [navigate, replace, back],
  );
}

export function useSearchParams() {
  const { search } = useAppRouter();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function redirect(url: string) {
  if (typeof window !== 'undefined') {
    window.location.hash = url;
  }
}
