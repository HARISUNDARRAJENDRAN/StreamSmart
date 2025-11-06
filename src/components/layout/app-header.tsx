'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useUser } from '@/contexts/UserContext';

export function AppHeader() {
  const { user, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#F5F5F5] border-b border-black/5 flex items-center justify-end px-8 gap-6">
      <div className="flex items-center gap-4">
        {/* Notification Button */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full text-black/60 hover:text-black hover:bg-black/5"
          >
            <BellIcon className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-black/10"></div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-10 px-2 rounded-full hover:bg-black/5 flex items-center gap-2"
            >
              <Avatar className="h-8 w-8 ring-2 ring-black/5">
                <AvatarImage 
                  src={user?.avatarUrl || "https://placehold.co/100x100.png"} 
                  alt={user?.name || "User Avatar"} 
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-purple-400 text-white text-xs font-semibold">
                  {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline text-sm font-medium text-black">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white border border-black/10" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-black">{user?.name || 'User'}</p>
                <p className="text-xs text-black/60">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-black/10" />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 text-black/70 hover:text-black">
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/10" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
