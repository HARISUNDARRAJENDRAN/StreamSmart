interface LoginData {
  email: string;
  password?: string;
  authProvider: 'email' | 'google' | 'demo';
  googleId?: string;
  name?: string;
  avatarUrl?: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface UpdateProfileData {
  userId: string;
  name?: string;
  phoneNumber?: string;
  bio?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: boolean;
  };
}

interface ApiResponse<T> {
  user?: T;
  error?: string;
}

const API_BASE_URL = '/api';

export const userService = {
  async login(data: LoginData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      return result;
    } catch (error) {
      console.error('Login service error:', error);
      return { error: error instanceof Error ? error.message : 'Login failed' };
    }
  },

  async register(data: RegisterData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      return result;
    } catch (error) {
      console.error('Registration service error:', error);
      return { error: error instanceof Error ? error.message : 'Registration failed' };
    }
  },

  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Profile update failed');
      }

      return result;
    } catch (error) {
      console.error('Profile update service error:', error);
      return { error: error instanceof Error ? error.message : 'Profile update failed' };
    }
  },

  async getProfile(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch profile');
      }

      return result;
    } catch (error) {
      console.error('Profile fetch service error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to fetch profile' };
    }
  },

  async updateWeeklyGoal(userId: string, weeklyGoal: number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/user/weekly-goal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, weeklyGoal }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update weekly goal');
      }

      return result;
    } catch (error) {
      console.error('Weekly goal update error:', error);
      return { error: 'Failed to update weekly goal' };
    }
  },
}; 