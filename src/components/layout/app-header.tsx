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
import { BellIcon, LogOutIcon, SettingsIcon, GripVerticalIcon } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useUser } from '@/contexts/UserContext';

export function AppHeader() {
  const { toggleSidebar, isMobile } = useSidebar();
  const { user, logout } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header 
      className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-800 px-4 backdrop-blur sm:px-6 bg-gradient-to-r from-black to-gray-900"
    >
      {isMobile && (
         <Button variant="ghost" size="icon" onClick={toggleSidebar} className="sm:hidden text-gray-300 hover:text-white hover:bg-white/10">
            <GripVerticalIcon className="h-6 w-6" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
      )}
      
      {/* Title/Logo area - now takes the space where search was */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-white">
          Dashboard
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full text-gray-300 hover:text-white hover:bg-white/10">
          <BellIcon className="h-5 w-5 text-red-400" />
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
                <AvatarFallback className="bg-red-600 text-white">
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-gray-900 border-gray-800" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-white">{user?.name || 'User'}</p>
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
            <DropdownMenuItem onClick={handleLogout} className="text-gray-300 hover:text-white hover:bg-red-600/20">
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
