import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

interface RouterContextType {
  pathname: string;
  search: string;
  navigate: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function RouterProvider({ children, initialPath = '/dashboard' }: { children: React.ReactNode; initialPath?: string }) {
  const getInitialPath = () => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && hash.startsWith('/')) return hash;
      const path = window.location.pathname;
      if (path && path !== '/' && path !== '/index.html') return path;
    }
    return initialPath;
  };

  const [currentUrl, setCurrentUrl] = useState<string>(getInitialPath);

  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash && hash.startsWith('/')) {
        setCurrentUrl(hash);
      } else {
        setCurrentUrl(window.location.pathname || initialPath);
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, [initialPath]);

  const navigate = useCallback((href: string) => {
    if (!href) return;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.location.href = href;
      return;
    }
    setCurrentUrl(href);
    if (typeof window !== 'undefined') {
      window.location.hash = href;
    }
  }, []);

  const replace = useCallback((href: string) => {
    if (!href) return;
    setCurrentUrl(href);
    if (typeof window !== 'undefined') {
      window.location.replace(`#${href}`);
    }
  }, []);

  const back = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  const [pathname, search] = useMemo(() => {
    const [p, s] = currentUrl.split('?');
    return [p || '/dashboard', s ? `?${s}` : ''];
  }, [currentUrl]);

  return (
    <RouterContext.Provider value={{ pathname, search, navigate, replace, back }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useAppRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    return {
      pathname: '/dashboard',
      search: '',
      navigate: () => {},
      replace: () => {},
      back: () => {},
    };
  }
  return ctx;
}
