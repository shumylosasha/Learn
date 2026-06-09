import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Review } from '@/types';

const REVIEWS_KEY = 'reviews_v1';
const LAST_REVIEW_KEY = 'last_review_at_v1';

interface ReviewsState {
  reviews: Review[]; // newest first
  lastReviewAt: number; // 0 if never
  generating: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  setGenerating: (v: boolean) => void;
  latest: () => Review | undefined;
}

export const useReviews = create<ReviewsState>((set, get) => ({
  reviews: [],
  lastReviewAt: 0,
  generating: false,
  loaded: false,

  load: async () => {
    const [rawReviews, rawLast] = await Promise.all([
      AsyncStorage.getItem(REVIEWS_KEY),
      AsyncStorage.getItem(LAST_REVIEW_KEY),
    ]);
    let reviews: Review[] = [];
    if (rawReviews) {
      try {
        reviews = JSON.parse(rawReviews);
      } catch {
        reviews = [];
      }
    }
    reviews.sort((a, b) => b.createdAt - a.createdAt);
    set({ reviews, lastReviewAt: rawLast ? Number(rawLast) : 0, loaded: true });
  },

  addReview: async (review: Review) => {
    const reviews = [review, ...get().reviews];
    set({ reviews, lastReviewAt: review.periodEnd });
    await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    await AsyncStorage.setItem(LAST_REVIEW_KEY, String(review.periodEnd));
  },

  setGenerating: (v: boolean) => set({ generating: v }),

  latest: () => get().reviews[0],
}));
