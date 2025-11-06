/**
 * Chart Component
 * Wrapper for recharts library
 */

'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

const Chart = RechartsPrimitive.ResponsiveContainer;

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartLegend = RechartsPrimitive.Legend;

// ChartContainer wrapper
const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { config?: any; children: React.ReactNode }
>(({ className, children, config, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('w-full', className)} {...props}>
      {children}
    </div>
  );
});
ChartContainer.displayName = 'ChartContainer';

// ChartTooltipContent
const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border bg-background p-2 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ChartTooltipContent.displayName = 'ChartTooltipContent';

export { Chart, ChartTooltip, ChartLegend, ChartContainer, ChartTooltipContent };

// Re-export recharts components for convenience
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadarChart,
  Radar,
  RadialBarChart,
  RadialBar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
