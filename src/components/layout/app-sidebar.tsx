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
import { HomeIcon, ListVideoIcon, BarChart3Icon, SettingsIcon, HelpCircleIcon, Trophy, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { href: '/playlists', label: 'Playlists', icon: ListVideoIcon },
  { href: '/productivity', label: 'Productivity', icon: Timer },
  { href: '/progress', label: 'My Progress', icon: BarChart3Icon },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-gray-800 bg-gradient-to-b from-black to-gray-900">
      <SidebarHeader className="flex items-center justify-between p-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <h1 className="text-xl font-semibold group-data-[collapsible=icon]:hidden text-white">
            <span className="text-red-600">S</span>treamSmart
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
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href.split('#')[0]))}
                tooltip={{ children: item.label, side: 'right', className:"bg-popover text-popover-foreground" }}
                className={cn(
                  "text-gray-300 hover:text-white hover:bg-white/10",
                  (pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href.split('#')[0]))) && 'bg-red-600 text-white hover:bg-red-700'
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
                  "text-gray-300 hover:text-white hover:bg-white/10",
                  pathname === '/settings' && 'bg-red-600 text-white hover:bg-red-700'
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
                  "text-gray-300 hover:text-white hover:bg-white/10",
                  pathname === '/help' && 'bg-red-600 text-white hover:bg-red-700'
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

