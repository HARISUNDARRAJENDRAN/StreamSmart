import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  userId: string;
  action: string;
  item: string;
  type: 'completed' | 'started' | 'created' | 'quiz';
  timestamp: Date;
}

const ActivitySchema = new Schema<IActivity>({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  item: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['completed', 'started', 'created', 'quiz']
  },
  timestamp: { type: Date, default: Date.now },
});

// Add indexes for better query performance
ActivitySchema.index({ userId: 1, timestamp: -1 });
ActivitySchema.index({ userId: 1, type: 1, timestamp: -1 });

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema); 