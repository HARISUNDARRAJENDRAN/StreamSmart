import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { UserProvider } from '@/contexts/UserContext';
import { Toaster } from '@/components/ui/toaster';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <AppHeader />
          <main 
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8" 
            style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(26, 26, 26, 0.8) 50%, rgba(15, 15, 15, 0.8) 100%)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </UserProvider>
  );
}
