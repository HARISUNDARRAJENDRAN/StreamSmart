'use client';

import { useState } from 'react';
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ShieldCheck,
  Bell,
  Palette,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';

type PreferenceKey = 'productUpdates' | 'learningReminders' | 'aiInsights';

interface PreferenceToggleProps {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

const PreferenceToggle = ({ label, description, active, onToggle }: PreferenceToggleProps) => (
  <div className="flex items-start justify-between rounded-2xl border border-black/10 bg-white/80 p-4 hover:border-black/20 transition-colors">
    <div className="pr-6">
      <p className="font-semibold text-black">{label}</p>
      <p className="text-sm text-black/60">{description}</p>
    </div>
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      className={`h-9 rounded-full px-4 ${active ? 'bg-black text-white hover:bg-black/90' : 'border-black/20 text-black hover:bg-black/5'}`}
      onClick={onToggle}
    >
      {active ? 'On' : 'Off'}
    </Button>
  </div>
);

const appearanceModes = [
  { key: 'dark', label: 'Dark', description: 'Best for low-light environments' },
  { key: 'light', label: 'Light', description: 'High contrast during daytime' },
  { key: 'auto', label: 'Auto', description: 'Sync with system preference' },
] as const;

export default function SettingsPage() {
  const { user } = useUser();
  const [preferences, setPreferences] = useState<Record<PreferenceKey, boolean>>({
    productUpdates: true,
    learningReminders: true,
    aiInsights: false,
  });
  const [appearance, setAppearance] = useState<typeof appearanceModes[number]['key']>('dark');

  const togglePreference = (key: PreferenceKey) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12">
      <header className="rounded-3xl border border-black/5 bg-gradient-to-br from-black to-gray-900 p-10 text-white shadow-[0_24px_60px_-32px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge className="w-fit bg-white/10 text-white hover:bg-white/10">Account Center</Badge>
            <h1 className="text-4xl font-semibold">Tailor StreamSmart to the way you learn</h1>
            <p className="max-w-2xl text-sm text-white/70">
              Update your profile, choose how we notify you, and keep your workspace focused with the new monochrome theme.
            </p>
          </div>
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <span>Profile completion at 80%</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-white/70" />
              <span>Last updated 2 days ago</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="border-black/10 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                Account overview
                <Badge variant="outline" className="border-emerald-500/60 text-emerald-600">Active</Badge>
              </CardTitle>
              <CardDescription className="text-black/60">
                Signed in as {user?.email || 'guest@streamsmart.ai'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-black/40">Member name</p>
                <p className="text-sm font-medium text-black">{user?.name || 'Guest learner'}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-black/40">Plan</p>
                <p className="text-sm font-medium text-black">Starter</p>
                <p className="text-xs text-black/50">Upgrade coming soon</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-black/70" />
                Security check-up
              </CardTitle>
              <CardDescription className="text-black/60">
                Keep your account safe with quick reviews.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-black/[0.04] px-4 py-3">
                <span className="font-medium text-black">Password strength</span>
                <Badge className="bg-black text-white hover:bg-black/90">Strong</Badge>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-dashed border-black/15 px-4 py-3">
                <span className="font-medium text-black">Two-factor authentication</span>
                <Button variant="outline" className="h-8 rounded-full border-black/20 px-4 text-sm text-black" type="button">
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-black/70" />
                Need assistance?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-black/70">
              <p>Chat with our support team or explore the deployment handbook.</p>
              <Button className="w-full rounded-full bg-black text-white hover:bg-black/90" type="button">
                Open Support Center
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-8">
          <ProfileSettingsForm />

          <Card className="border-black/10 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-black/70" />
                Notification preferences
              </CardTitle>
              <CardDescription className="text-black/60">
                Decide when StreamSmart should keep you in the loop.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PreferenceToggle
                label="Product updates"
                description="Be first to know when we ship new features and AI agents."
                active={preferences.productUpdates}
                onToggle={() => togglePreference('productUpdates')}
              />
              <PreferenceToggle
                label="Learning reminders"
                description="Weekly summary of your watch time and playlists in progress."
                active={preferences.learningReminders}
                onToggle={() => togglePreference('learningReminders')}
              />
              <PreferenceToggle
                label="AI insights"
                description="Highlights when recommendation quality spikes or dips."
                active={preferences.aiInsights}
                onToggle={() => togglePreference('aiInsights')}
              />
            </CardContent>
          </Card>

          <Card className="border-black/10 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-black/70" />
                Appearance
              </CardTitle>
              <CardDescription className="text-black/60">
                Switch between visual modes for different workspaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {appearanceModes.map((mode) => (
                  <Button
                    key={mode.key}
                    type="button"
                    variant={appearance === mode.key ? 'default' : 'outline'}
                    className={`h-auto rounded-2xl border-black/15 px-4 py-4 text-left ${
                      appearance === mode.key
                        ? 'bg-black text-white hover:bg-black/90'
                        : 'bg-white text-black hover:bg-black/5'
                    }`}
                    onClick={() => setAppearance(mode.key)}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{mode.label}</p>
                      <p className="text-xs text-black/60">{mode.description}</p>
                    </div>
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-black/[0.04] p-4 text-sm text-black/70">
                <Sparkles className="h-4 w-4 text-black/60" />
                <span>Your selection updates the interface instantly — no refresh needed.</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
