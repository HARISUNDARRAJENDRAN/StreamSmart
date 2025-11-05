'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BellIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

export function AppHeader() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled((window?.scrollY || 0) > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header 
      className="sticky top-0 z-30 flex h-16 items-center gap-4 px-4 sm:px-6 backdrop-blur"
      style={{
        background: scrolled 
          ? 'rgba(10,10,11,0.55)'
          : 'linear-gradient(180deg, rgba(10,10,11,0.45) 0%, rgba(10,10,11,0.28) 60%, rgba(10,10,11,0) 100%)',
        boxShadow: scrolled 
          ? 'inset 0 -1px 0 rgba(255,255,255,0.06)'
          : 'inset 0 -1px 0 rgba(255,255,255,0.03)'
      }}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' }} />
        <Link href="/ai-feed" className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>StreamSmart</Link>
      </div>

      {/* Center: Top navigation */}
      <nav className="hidden md:flex items-center gap-1 mx-auto">
        {[
          { href: '/ai-feed', label: '✨ AI Feed' },
          { href: '/playlists', label: 'Playlists' },
          { href: '/productivity', label: 'Productivity' },
          { href: '/achievements', label: 'Achievements' },
        ].map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button 
                variant="ghost" 
                className="px-4 hover:bg-white/5"
                style={{
                  color: active ? 'hsl(var(--foreground))' : '#B1B1BB',
                  background: active ? 'rgba(139,92,246,0.10)' : 'transparent',
                  border: '1px solid transparent',
                  borderBottom: active ? '2px solid rgba(139,92,246,0.45)' : '2px solid transparent',
                  borderRadius: 10,
                  paddingBottom: 10
                }}
              >
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full text-gray-300 hover:text-white hover:bg-white/10">
          <BellIcon className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
          <span className="sr-only">Notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-white/10">
              <Avatar className="h-9 w-9">
                <AvatarImage 
                  src={user?.avatarUrl || "https://placehold.co/100x100.png"} 
                  alt={user?.name || "User Avatar"} 
                  data-ai-hint="user avatar" 
                />
                <AvatarFallback className="text-white" style={{ background: 'hsl(var(--primary))' }}>
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" style={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none" style={{ color: 'hsl(var(--foreground))' }}>{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-gray-400">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-white/10">
              <Link href="/settings">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-800" />
            <DropdownMenuItem onClick={handleLogout} className="text-gray-300 hover:text-white" style={{ background: 'transparent' }}>
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* subtle bottom hairline for separation */}
      <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
    </header>
  );
}
