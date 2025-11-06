'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { Toaster } from '@/components/ui/toaster';
import { useIsMobile } from '@/hooks/use-mobile';

export function SidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-[#F5F5F5]" suppressHydrationWarning>
        <AppSidebar />
        <div className="flex flex-1 flex-col w-full min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-4 md:py-6">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
