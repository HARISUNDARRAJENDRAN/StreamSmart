import { UserProvider } from '@/contexts/UserContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ExtensionTokenManager } from '@/components/extension/ExtensionTokenManager';
import { SidebarWrapper } from '@/components/layout/sidebar-wrapper';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <UserProvider>
        <ExtensionTokenManager />
        <SidebarWrapper>
          {children}
        </SidebarWrapper>
      </UserProvider>
    </AuthProvider>
  );
}
