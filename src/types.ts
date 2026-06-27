export type User = {
  id: string;
  email: string;
  displayName: string;
  avatarCode: string;
  avatarUrl: string | null;
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
  avatarUrl: string | null;
  productCode: string;
  localDate: string;
  durationBucket: string;
  publicStreak: number | null;
  publicWeekCount: number | null;
  publicTotalCount: number | null;
  note: string | null;
  imageUrl: string | null;
  encouragementCount: number;
  commentCount: number;
  encouragedByMe: boolean;
  createdAt: string;
};

export type CommunityComment = {
  id: string;
  postId: string;
  userId: string;
  nickname: string;
  avatarCode: string;
  avatarUrl: string | null;
  content: string;
  canDelete: boolean;
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

export type UploadedAsset = {
  id: string;
  kind: "avatar" | "community" | "nutrition";
  url: string | null;
  contentType: string;
  byteSize: number;
  originalName: string | null;
  createdAt: string;
};
