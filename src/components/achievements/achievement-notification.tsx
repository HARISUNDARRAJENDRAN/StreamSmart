'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Achievement } from './achievements-system';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'diamond': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.5 
          }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Trophy className="h-6 w-6 text-yellow-600" />
                  </div>
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                  </motion.div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-yellow-800">Achievement Unlocked!</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                      }}
                      className="h-6 w-6 p-0 text-yellow-600 hover:text-yellow-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                      <Badge className={`text-xs ${getTierColor(achievement.tier)}`}>
                        {achievement.tier}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{achievement.description}</p>
                    <p className="text-xs font-medium text-yellow-700">
                      +{achievement.points} points earned!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 