'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SettingsIcon, Loader2Icon } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

export function WeeklyGoalSettings() {
  const { user, updateWeeklyGoal } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [goalValue, setGoalValue] = useState(user?.weeklyGoal || 15);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (goalValue < 1 || goalValue > 100) {
      toast({
        title: 'Invalid Goal',
        description: 'Please enter a goal between 1 and 100 videos per week.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const result = await updateWeeklyGoal(goalValue);

    if (result.success) {
      toast({
        title: 'Goal Updated',
        description: `Your weekly goal has been set to ${goalValue} videos.`,
      });
      setOpen(false);
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update weekly goal.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SettingsIcon className="h-4 w-4" />
          <span className="sr-only">Edit weekly goal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Weekly Goal</DialogTitle>
          <DialogDescription>
            Set your personal weekly learning target. This helps track your progress and maintain consistency.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goal" className="text-right">
              Videos per week
            </Label>
            <Input
              id="goal"
              type="number"
              value={goalValue}
              onChange={(e) => setGoalValue(parseInt(e.target.value) || 0)}
              className="col-span-3"
              min="1"
              max="100"
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Recommended: 10-20 videos per week for consistent learning.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Save Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 