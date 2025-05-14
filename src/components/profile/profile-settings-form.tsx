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
import { UserCircle2Icon, Edit3Icon, MailIcon, PhoneIcon, InfoIcon, SaveIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const profileSettingsSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  phoneNumber: z.string().optional(),
  bio: z.string().max(200, { message: "Bio cannot exceed 200 characters." }).optional(),
});

type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

// Placeholder user data
const currentUser = {
  email: "alex.doe@example.com",
  avatarUrl: "https://placehold.co/120x120.png",
  initialName: "Alex Doe",
  initialPhone: "",
  initialBio: "Loves learning new technologies and building cool stuff!",
};

export function ProfileSettingsForm() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false); // For future use if we want a separate edit mode

  const form = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      fullName: currentUser.initialName,
      phoneNumber: currentUser.initialPhone,
      bio: currentUser.initialBio,
    },
  });

  const onSubmit = (data: ProfileSettingsFormValues) => {
    console.log('Profile settings submitted:', data);
    // TODO: Implement actual saving logic (e.g., to an API or localStorage)
    toast({
      title: "Settings Saved (Mock)",
      description: "Your profile information has been updated (simulated).",
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary">
              <AvatarImage src={currentUser.avatarUrl} alt="User Avatar" data-ai-hint="user avatar" />
              <AvatarFallback><UserCircle2Icon className="h-12 w-12" /></AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-2xl">{form.watch('fullName') || currentUser.initialName}</CardTitle>
              <CardDescription>{currentUser.email}</CardDescription>
              {/* Placeholder for avatar upload/change button */}
              {/* <Button variant="outline" size="sm" className="mt-2">
                <Edit3Icon className="mr-2 h-4 w-4" /> Change Avatar
              </Button> */}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative mt-1">
              <UserCircle2Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                {...form.register('fullName')}
                placeholder="Your full name"
                className="pl-10"
              />
            </div>
            {form.formState.errors.fullName && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.fullName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
             <div className="relative mt-1">
              <MailIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={currentUser.email}
                disabled
                className="pl-10 bg-muted/50 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
            <div className="relative mt-1">
              <PhoneIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phoneNumber"
                {...form.register('phoneNumber')}
                placeholder="Your phone number"
                className="pl-10"
              />
            </div>
             {form.formState.errors.phoneNumber && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.phoneNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="bio">Bio (Optional)</Label>
             <div className="relative mt-1">
              <InfoIcon className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Textarea
                id="bio"
                {...form.register('bio')}
                placeholder="Tell us a little about yourself..."
                rows={3}
                className="pl-10 pt-2" 
              />
            </div>
             {form.formState.errors.bio && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.bio.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button type="submit" className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <SaveIcon className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
