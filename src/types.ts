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

export type MemorySummary = {
  totalItems: number;
  dueCount: number;
  reviewedToday: number;
  rememberedToday: number;
  forgottenToday: number;
  retention7d: number;
  streak: number;
  recentDates: string[];
};

export type MemoryDeck = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  dueCount: number;
  createdAt: string;
};

export type MemoryItem = {
  id: string;
  deckId: string | null;
  deckName: string | null;
  prompt: string;
  answer: string;
  category: string;
  tags: string[];
  status: string;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemorySessionResult = {
  session: {
    id: string;
    mode: string;
    itemCount: number;
    rememberedCount: number;
    forgottenCount: number;
    durationSec: number;
    localDate: string;
    createdAt: string;
  };
  summary: MemorySummary;
};

export type MemoryLocus = {
  id: string;
  palaceId?: string;
  title: string;
  positionOrder: number;
  description: string | null;
  itemId: string | null;
  prompt: string | null;
  createdAt: string;
};

export type MemoryPalaceLayout = {
  viewpoint: string;
  palette: string[];
  style: string;
  points: Array<{
    locusId: string | null;
    title: string;
    x: number;
    y: number;
    hint: string;
  }>;
};

export type MemoryPalace = {
  id: string;
  name: string;
  sceneType: string;
  lociCount: number;
  imageUrl: string | null;
  imagePrompt: string | null;
  imageModel: string | null;
  layout: MemoryPalaceLayout | null;
  generatedAt: string | null;
  createdAt: string;
  loci: MemoryLocus[];
};

export type MemoryCardDraft = {
  prompt: string;
  answer: string;
  tags: string[];
};
