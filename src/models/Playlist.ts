import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylist extends Document {
  userId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  videos: Array<{
    id: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    duration: string;
    url: string;
    completionStatus: number;
  }>;
  overallProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  videos: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    channelTitle: { type: String, required: false, default: '' },
    thumbnail: { type: String, required: true },
    duration: { type: String, required: true },
    url: { type: String, required: true },
    completionStatus: { type: Number, default: 0 },
  }],
  overallProgress: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Add indexes for better query performance
PlaylistSchema.index({ userId: 1, createdAt: -1 });
PlaylistSchema.index({ userId: 1, category: 1 });

export default mongoose.models.Playlist || mongoose.model<IPlaylist>('Playlist', PlaylistSchema); 