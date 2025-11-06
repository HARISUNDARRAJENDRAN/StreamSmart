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
import { Sparkles, ListVideoIcon, SettingsIcon, HelpCircleIcon, Trophy, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/ai-feed', label: 'AI Feed', icon: Sparkles },
  { href: '/playlists', label: 'Playlists', icon: ListVideoIcon },
  { href: '/productivity', label: 'Productivity', icon: Timer },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-black/5 bg-white">
      <SidebarHeader className="flex items-center justify-between px-4 py-3 border-b border-black/5">
        <Link href="/ai-feed" className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-black to-gray-900 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-black group-data-[collapsible=icon]:hidden truncate leading-tight">
              StreamSmart
            </h1>
          </div>
        </Link>
        <SidebarTrigger className="w-5 h-5 p-1.5 rounded-[10px] hover:bg-black/5 transition-colors text-black/60 hover:text-black flex-shrink-0" />
      </SidebarHeader>
      <SidebarContent className="flex-1 p-3">
        <SidebarMenu className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href.split('#')[0]);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: item.label, side: 'right', className:"bg-white text-black border border-black/10 shadow-sm" }}
                  className={cn(
                    "transition-all duration-200 hover:translate-x-1 rounded-[12px]",
                    isActive
                      ? "bg-black text-white hover:bg-black/90 shadow-sm"
                      : "text-black/70 hover:bg-black/5 hover:text-black"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-black/5">
         <SidebarMenu className="space-y-1">
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={{ children: 'Settings', side: 'right', className:"bg-white text-black border border-black/10 shadow-sm" }}
                isActive={pathname === '/settings'}
                className={cn(
                  "transition-all duration-200 hover:translate-x-1 rounded-[12px]",
                  pathname === '/settings'
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : "text-black/70 hover:bg-black/5 hover:text-black"
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
                tooltip={{ children: 'Help', side: 'right', className:"bg-white text-black border border-black/10 shadow-sm" }}
                isActive={pathname === '/help'}
                className={cn(
                  "transition-all duration-200 hover:translate-x-1 rounded-[12px]",
                  pathname === '/help'
                    ? "bg-black text-white hover:bg-black/90 shadow-sm"
                    : "text-black/70 hover:bg-black/5 hover:text-black"
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

