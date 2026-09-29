import type { ReactNode } from 'react'
import { AppShell } from '@/components/nudge/app-shell'
import { StoreProvider } from '@/components/nudge/store'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  )
}
