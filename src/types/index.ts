export interface Recipe {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  ingredients: string[];
  instructions: string;
  userId: string;
  attribution?: {
    socialHandle?: string;
    sourceUrl?: string;
  };
  createdAt: string;
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface User {
  id: string;
  email: string;
  avatarUrl?: string;
}

export interface VideoFrame {
  timestamp: number;
  description: string;
  imageUrl: string;
}

export interface RecipeInteraction {
  id: string;
  userId: string;
  recipeId: string;
  liked: boolean;
  saved: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RecipeTab = 'uploaded' | 'liked' | 'saved';