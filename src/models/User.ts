import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phoneNumber?: string;
  bio?: string;
  createdAt: Date;
  lastLoginDate: Date;
  learningStreak: number;
  totalLearningTime: number;
  weeklyGoal: number;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
  // Authentication fields
  authProvider: 'email' | 'google' | 'demo';
  password?: string; // For email auth
  googleId?: string; // For Google auth
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
    maxlength: 200,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginDate: {
    type: Date,
    default: Date.now,
  },
  learningStreak: {
    type: Number,
    default: 0,
  },
  totalLearningTime: {
    type: Number,
    default: 0,
  },
  weeklyGoal: {
    type: Number,
    default: 15,
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    notifications: {
      type: Boolean,
      default: true,
    },
  },
  authProvider: {
    type: String,
    enum: ['email', 'google', 'demo'],
    required: true,
  },
  password: {
    type: String,
    default: null,
  },
  googleId: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Add password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Create indexes
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 