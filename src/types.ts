export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarCode: string;
  createdAt: string;
};

export type HomeSummary = {
  completedToday: boolean;
  weekCount: number;
  streak: number;
  totalCount: number;
  recentDates: string[];
};

export type CommunityPost = {
  id: string;
  userId: string;
  nickname: string;
  avatarCode: string;
  productCode: string;
  localDate: string;
  durationBucket: string;
  publicStreak: number | null;
  publicWeekCount: number | null;
  publicTotalCount: number | null;
  note: string | null;
  encouragementCount: number;
  commentCount: number;
  encouragedByMe: boolean;
  createdAt: string;
};

export type Checkin = {
  id: string;
  localDate: string;
  productCode: string;
  durationSec: number;
  createdAt: string;
  shared: boolean;
};

export type TrainingCompleteResult = {
  checkin: Checkin;
  summary: HomeSummary;
};
