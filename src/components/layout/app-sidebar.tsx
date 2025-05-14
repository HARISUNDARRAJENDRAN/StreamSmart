'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { HomeIcon, ListVideoIcon, BarChart3Icon, SettingsIcon, HelpCircleIcon, BotMessageSquareIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/playlists', label: 'Playlists', icon: ListVideoIcon },
  { href: '/progress', label: 'My Progress', icon: BarChart3Icon },
  // Add more items as needed e.g. AI Chatbot global access if any
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="flex items-center justify-between p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BotMessageSquareIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold group-data-[collapsible=icon]:hidden">
            LearnFlow
          </h1>
        </Link>
        <div className="group-data-[collapsible=icon]:hidden">
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={{ children: item.label, side: 'right', className:"bg-popover text-popover-foreground" }}
                className={cn(
                  (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))) && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
         <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={{ children: 'Settings', side: 'right', className:"bg-popover text-popover-foreground" }}
                isActive={pathname === '/settings'}
                className={cn(
                  pathname === '/settings' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
                >
                <Link href="/settings">
                  <SettingsIcon className="h-5 w-5" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={{ children: 'Help', side: 'right', className:"bg-popover text-popover-foreground" }}
                isActive={pathname === '/help'}
                 className={cn(
                  pathname === '/help' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                )}
                >
                <Link href="/help">
                  <HelpCircleIcon className="h-5 w-5" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Help</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
