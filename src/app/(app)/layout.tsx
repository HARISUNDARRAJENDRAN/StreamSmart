import { AppHeader } from '@/components/layout/app-header';
import { UserProvider } from '@/contexts/UserContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { ExtensionTokenManager } from '@/components/extension/ExtensionTokenManager';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <UserProvider>
        <ExtensionTokenManager />
        <div className="flex min-h-screen flex-col" style={{ background: 'linear-gradient(135deg, #0A0A0B 0%, #1A1A2E 50%, #16213E 100%)' }}>
          <AppHeader />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
            <div className="max-w-full overflow-x-hidden">
              {children}
            </div>
          </main>
          <Toaster />
        </div>
      </UserProvider>
    </AuthProvider>
  );
}
