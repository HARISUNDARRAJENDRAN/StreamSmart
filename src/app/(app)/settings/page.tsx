import { ProfileSettingsForm } from '@/components/profile/profile-settings-form';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences.</p>
      </header>
      <ProfileSettingsForm />
    </div>
  );
}
