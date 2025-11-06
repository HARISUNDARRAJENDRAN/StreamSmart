'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCircle2Icon, MailIcon, PhoneIcon, InfoIcon, SaveIcon, Loader2Icon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/contexts/UserContext';
import React from 'react';

const profileSettingsSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  phoneNumber: z.string().optional(),
  bio: z.string().max(200, { message: "Bio cannot exceed 200 characters." }).optional(),
});

type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

export function ProfileSettingsForm() {
  const { toast } = useToast();
  const { user, updateUserProfile, isLoading: userLoading } = useUser();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      fullName: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      bio: user?.bio || '',
    },
  });

  // Update form when user data changes
  React.useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.name || '',
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
      });
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileSettingsFormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "No user logged in. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateUserProfile({
        name: data.fullName,
        phoneNumber: data.phoneNumber || '',
        bio: data.bio || '',
      });

      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Your profile information has been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save profile settings. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state if no user or user is loading
  if (userLoading || !user) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-2">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            <p className="text-muted-foreground">Loading user data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="rounded-[28px] border border-black/10 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.35)] bg-white">
        <CardHeader className="rounded-t-[28px] border-b border-black/5 bg-gradient-to-r from-black/[0.04] to-transparent">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar className="h-24 w-24 border-2 border-black">
              <AvatarImage src={user.avatarUrl || "https://placehold.co/120x120.png"} alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback>
                <UserCircle2Icon className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl">{form.watch('fullName') || user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
              {/* Placeholder for avatar upload/change button */}
              {/* <Button variant="outline" size="sm" className="mt-2">
                <Edit3Icon className="mr-2 h-4 w-4" /> Change Avatar
              </Button> */}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <UserCircle2Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullName"
                  {...form.register('fullName')}
                  placeholder="Your full name"
                  className="pl-10"
                  disabled={isSaving}
                />
              </div>
              {form.formState.errors.fullName && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="pl-10 bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phoneNumber"
                  {...form.register('phoneNumber')}
                  placeholder="Your phone number"
                  className="pl-10"
                  disabled={isSaving}
                />
              </div>
              {form.formState.errors.phoneNumber && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <div className="relative">
                <InfoIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Textarea
                  id="bio"
                  {...form.register('bio')}
                  placeholder="Tell us a little about yourself..."
                  rows={4}
                  className="pl-10 pt-2"
                  disabled={isSaving}
                />
              </div>
              {form.formState.errors.bio && (
                <p className="mt-1 text-sm text-destructive">{form.formState.errors.bio.message}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t border-black/5 bg-black/[0.02] rounded-b-[28px] px-6 py-6">
          <Button 
            type="submit" 
            className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
