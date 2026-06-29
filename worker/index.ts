import { timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PASSWORD_ITERATIONS = 10_000;
const MIN_PASSWORD_ITERATIONS = 5_000;
const SESSION_DAYS = 30;
const XFYUN_TTS_DEFAULT_URL = "wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6";
const XFYUN_TTS_DEFAULT_VOICE = "x5_lingfeiyi_flow";
const XFYUN_TTS_DEFAULT_ORAL_LEVEL = "mid";
const XFYUN_TTS_TIMEOUT_MS = 15_000;
const XFYUN_TTS_MAX_AUDIO_BYTES = 1_200_000;
const XFYUN_TTS_CACHE_SECONDS = 60 * 60 * 24 * 30;
const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;
const ARK_DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const ARK_DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-260128";
const ARK_DEFAULT_CHAT_MODEL = "doubao-seed-character-260628";
const ARK_DEFAULT_IMAGE_SIZE = "2K";
const ARK_TIMEOUT_MS = 65_000;
const ARK_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AI_SOURCE_LENGTH = 4_000;

type JsonObject = Record<string, unknown>;

type SessionUserRow = {
  id: string;
  email: string;
  displayName: string;
  avatarCode: string;
  avatarImageKey: string | null;
  createdAt: string;
  timezone: string;
};

type CheckinRow = {
  id: string;
  localDate: string;
  productCode: string;
  durationSec: number;
  createdAt: string;
  shared: number;
};

type CommunityPostRow = {
  id: string;
  userId: string;
  nickname: string;
  avatarCode: string;
  avatarImageKey: string | null;
  productCode: string;
  localDate: string;
  durationBucket: string;
  publicStreak: number | null;
  publicWeekCount: number | null;
  publicTotalCount: number | null;
  note: string | null;
  imageKey: string | null;
  encouragementCount: number;
  commentCount: number;
  encouragedByMe: number;
  createdAt: string;
};

type CommunityCommentRow = {
  id: string;
  postId: string;
  userId: string;
  nickname: string;
  avatarCode: string;
  avatarImageKey: string | null;
  content: string;
  canDelete: number;
  createdAt: string;
};

type AssetKind = "avatar" | "community" | "nutrition";

type AssetRow = {
  id: string;
  kind: AssetKind;
  objectKey: string;
  contentType: string;
  byteSize: number;
  originalName: string | null;
  createdAt: string;
};

type MemoryItemRow = {
  id: string;
  deckId: string | null;
  deckName: string | null;
  prompt: string;
  answer: string;
  category: string;
  tags: string | null;
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

type MemoryDeckRow = {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  dueCount: number;
  createdAt: string;
};

type MemoryPalaceRow = {
  id: string;
  name: string;
  sceneType: string;
  lociCount: number;
  imageKey: string | null;
  imagePrompt: string | null;
  imageModel: string | null;
  layoutJson: string | null;
  generatedAt: string | null;
  createdAt: string;
};

type MemoryLocusRow = {
  id: string;
  palaceId?: string;
  title: string;
  positionOrder: number;
  description: string | null;
  itemId: string | null;
  prompt: string | null;
  createdAt: string;
};

type MemorySummary = {
  totalItems: number;
  dueCount: number;
  reviewedToday: number;
  rememberedToday: number;
  forgottenToday: number;
  retention7d: number;
  streak: number;
  recentDates: string[];
};

type MemorySessionRow = {
  id: string;
  mode: string;
  itemCount: number;
  rememberedCount: number;
  forgottenCount: number;
  durationSec: number;
  localDate: string;
  createdAt: string;
};

type ArkBindings = {
  ARK_API_KEY?: string;
  ARK_BASE_URL?: string;
  ARK_IMAGE_MODEL?: string;
  ARK_CHAT_MODEL?: string;
  ARK_IMAGE_SIZE?: string;
};

type ArkConfig = {
  apiKey: string;
  baseUrl: string;
  imageModel: string;
  chatModel: string;
  imageSize: string;
};

type MemoryLayoutPoint = {
  locusId: string | null;
  title: string;
  x: number;
  y: number;
  hint: string;
};

type MemoryPalaceLayout = {
  viewpoint: string;
  palette: string[];
  style: string;
  points: MemoryLayoutPoint[];
};

type MemoryCardDraft = {
  prompt: string;
  answer: string;
  tags: string[];
};

type Summary = {
  completedToday: boolean;
  weekCount: number;
  streak: number;
  totalCount: number;
  recentDates: string[];
};

type TrainingSpeechPhase = "left" | "switch" | "right" | "relax";

type XfyunTtsBindings = {
  XFYUN_TTS_APP_ID?: string;
  XFYUN_TTS_API_PASSWORD?: string;
  XFYUN_TTS_API_KEY?: string;
  XFYUN_TTS_API_SECRET?: string;
  XFYUN_TTS_URL?: string;
  XFYUN_TTS_VOICE?: string;
  XFYUN_TTS_ORAL_LEVEL?: string;
};

type XfyunTtsConfig = {
  appId: string;
  apiPassword: string;
  apiKey: string;
  apiSecret: string;
  endpoint: string;
  voice: string;
  oralLevel: string;
};

type XfyunTtsResponse = {
  header?: {
    code?: number;
    message?: string;
    sid?: string;
    status?: number;
  };
  payload?: {
    audio?: {
      audio?: string;
      status?: number;
    };
  };
};

const trainingSpeechCopy: Record<TrainingSpeechPhase, string> = {
  left: "左眼专注。轻遮右眼，注视中心的小点。",
  switch: "准备换眼。放下双手，眨眨眼睛。",
  right: "右眼专注。轻遮左眼，继续跟随节奏。",
  relax: "双眼放松。自然睁开双眼，然后望向远处实物。",
};

const apiHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const audioHeaders = {
  "Cache-Control": "private, max-age=0, must-revalidate",
  "Content-Type": "audio/mpeg",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const publicAssetHeaders = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, {
    status,
    headers: { ...apiHeaders, ...headers },
  });
}

function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

async function readBody(request: Request): Promise<JsonObject | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 16_384) return null;
  try {
    return asObject(await request.json());
  } catch {
    return null;
  }
}

function readString(body: JsonObject, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCommentContent(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeMemoryText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function normalizeMemoryCategory(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "").slice(0, 32);
  return normalized || "learning";
}

function normalizeMemoryTags(value: string): string | null {
  const tags = value
    .split(/[,，#\s]+/g)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
  return tags.length > 0 ? JSON.stringify([...new Set(tags)]) : null;
}

function parseMemoryTags(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string): JsonObject | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return asObject(parsed);
  } catch {
    const fenced = value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return asObject(JSON.parse(fenced.slice(start, end + 1)) as unknown);
    } catch {
      return null;
    }
  }
}

function parseMemoryLayout(value: string | null): MemoryPalaceLayout | null {
  if (!value) return null;
  const parsed = parseJsonObject(value);
  if (!parsed) return null;
  const rawPoints = Array.isArray(parsed.points) ? parsed.points : [];
  const points = rawPoints
    .map((item): MemoryLayoutPoint | null => {
      const object = asObject(item);
      if (!object) return null;
      const title = typeof object.title === "string" ? normalizeMemoryText(object.title, 40) : "";
      if (!title) return null;
      const x = clampInteger(Math.round(Number(object.x)), 4, 96, 50);
      const y = clampInteger(Math.round(Number(object.y)), 4, 96, 50);
      return {
        locusId: typeof object.locusId === "string" ? object.locusId : null,
        title,
        x,
        y,
        hint: typeof object.hint === "string" ? normalizeMemoryText(object.hint, 80) : "",
      };
    })
    .filter((item): item is MemoryLayoutPoint => Boolean(item))
    .slice(0, 12);

  const palette = Array.isArray(parsed.palette)
    ? parsed.palette.filter((item): item is string => typeof item === "string").slice(0, 6)
    : [];
  return {
    viewpoint: typeof parsed.viewpoint === "string" ? normalizeMemoryText(parsed.viewpoint, 60) : "2.5D isometric",
    palette,
    style: typeof parsed.style === "string" ? normalizeMemoryText(parsed.style, 120) : "calm wellness memory palace",
    points,
  };
}

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function scheduleMemoryReview(item: Pick<MemoryItemRow, "easeFactor" | "intervalDays" | "reviewCount" | "lapseCount">, rating: number) {
  const currentEase = Number.isFinite(item.easeFactor) ? item.easeFactor : 2.5;
  const currentInterval = Math.max(0, Number(item.intervalDays) || 0);
  const reviewedBefore = item.reviewCount > 0;
  let easeFactor = currentEase;
  let intervalDays = 1;
  let lapseCount = item.lapseCount;

  if (rating === 0) {
    easeFactor = Math.max(1.3, currentEase - 0.28);
    intervalDays = 1;
    lapseCount += 1;
  } else if (rating === 1) {
    easeFactor = Math.max(1.3, currentEase - 0.12);
    intervalDays = reviewedBefore ? Math.max(1, Math.round(currentInterval * 1.2)) : 1;
  } else if (rating === 2) {
    intervalDays = reviewedBefore ? Math.max(3, Math.round(Math.max(1, currentInterval) * easeFactor)) : 3;
  } else {
    easeFactor = Math.min(3.2, currentEase + 0.16);
    intervalDays = reviewedBefore ? Math.max(7, Math.round(Math.max(1, currentInterval) * (easeFactor + 0.55))) : 7;
  }

  const nextReview = new Date(Date.now() + intervalDays * 86_400_000);
  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    lapseCount,
    nextReviewAt: sqlTimestamp(nextReview),
  };
}

function bytesToHex(value: ArrayBuffer | ArrayBufferView): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(value: ArrayBuffer | ArrayBufferView): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    const chunk = bytes.subarray(index, index + 8192);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function concatBytes(parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function stringToBase64(value: string): string {
  return bytesToBase64(encoder.encode(value));
}

function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
  if (value.length % 2 !== 0) return new Uint8Array(new ArrayBuffer(0));
  const result = new Uint8Array(new ArrayBuffer(value.length / 2));
  for (let index = 0; index < value.length; index += 2) {
    const byte = Number.parseInt(value.slice(index, index + 2), 16);
    if (Number.isNaN(byte)) return new Uint8Array(new ArrayBuffer(0));
    result[index / 2] = byte;
  }
  return result;
}

async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function hmacSha256Base64(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(new ArrayBuffer(16));
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", iterations: PASSWORD_ITERATIONS, salt },
    key,
    256,
  );
  return `${PASSWORD_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(bits)}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterationValue, saltValue, expectedValue] = stored.split(":");
  const iterations = Number(iterationValue);
  const salt = hexToBytes(saltValue ?? "");
  const expected = hexToBytes(expectedValue ?? "");
  if (!Number.isInteger(iterations) || iterations < MIN_PASSWORD_ITERATIONS || salt.length !== 16 || expected.length !== 32) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const actual = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", iterations, salt },
    key,
    256,
  );
  return timingSafeEqual(new Uint8Array(actual), expected);
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function sqlTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `xijian_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${secure}`;
}

function clearSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `xijian_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?1, ?2, ?3, ?4)",
  )
    .bind(crypto.randomUUID(), userId, tokenHash, sqlTimestamp(expiresAt))
    .run();
  return token;
}

async function currentUser(request: Request, env: Env): Promise<SessionUserRow | null> {
  const token = getCookie(request, "xijian_session");
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  return env.DB.prepare(
    `SELECT
      u.id,
      u.email,
      u.display_name AS displayName,
      COALESCE(cp.avatar_code, 'moss') AS avatarCode,
      cp.avatar_image_key AS avatarImageKey,
      u.created_at AS createdAt,
      u.timezone
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN community_profiles cp ON cp.user_id = u.id
    WHERE s.token_hash = ?1
      AND s.expires_at > datetime('now')
      AND u.status = 'active'
    LIMIT 1`,
  )
    .bind(tokenHash)
    .first<SessionUserRow>();
}

function publicUser(user: SessionUserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarCode: user.avatarCode,
    avatarUrl: assetUrl(user.avatarImageKey),
    createdAt: user.createdAt,
  };
}

function localDate(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function daysAgoDate(days: number, timezone: string): string {
  const date = new Date(Date.now() - days * 86_400_000);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function getSummary(env: Env, user: SessionUserRow | null): Promise<Summary> {
  if (!user) {
    return { completedToday: false, weekCount: 0, streak: 0, totalCount: 0, recentDates: [] };
  }
  const today = localDate(user.timezone);
  const weekStart = daysAgoDate(6, user.timezone);
  const [recentResult, totalResult] = await env.DB.batch<{
    localDate?: string;
    total?: number;
  }>([
    env.DB.prepare(
      "SELECT local_date AS localDate FROM checkins WHERE user_id = ?1 AND local_date >= ?2 ORDER BY local_date ASC",
    ).bind(user.id, weekStart),
    env.DB.prepare("SELECT COUNT(*) AS total FROM checkins WHERE user_id = ?1").bind(user.id),
  ]);
  const recentDates = recentResult.results
    .map((row) => row.localDate)
    .filter((value): value is string => typeof value === "string");
  const total = Number(totalResult.results[0]?.total ?? 0);

  const streakRows = await env.DB.prepare(
    "SELECT local_date AS localDate FROM checkins WHERE user_id = ?1 ORDER BY local_date DESC LIMIT 366",
  )
    .bind(user.id)
    .all<{ localDate: string }>();
  const completed = new Set(streakRows.results.map((row) => row.localDate));
  let streak = 0;
  for (let offset = 0; offset < 366; offset += 1) {
    if (!completed.has(daysAgoDate(offset, user.timezone))) break;
    streak += 1;
  }

  return {
    completedToday: recentDates.includes(today),
    weekCount: recentDates.length,
    streak,
    totalCount: total,
    recentDates,
  };
}

function avatarFromId(id: string): string {
  const choices = ["moss", "sage", "fern", "pond", "stone"];
  const first = id.codePointAt(0) ?? 0;
  return choices[first % choices.length] ?? "moss";
}

function assetUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/api/assets/${key.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function publicAsset(row: AssetRow) {
  return {
    id: row.id,
    kind: row.kind,
    url: assetUrl(row.objectKey),
    contentType: row.contentType,
    byteSize: row.byteSize,
    originalName: row.originalName,
    createdAt: row.createdAt,
  };
}

function publicMemoryItem(row: MemoryItemRow) {
  return {
    ...row,
    tags: parseMemoryTags(row.tags),
    easeFactor: Number(row.easeFactor),
    intervalDays: Number(row.intervalDays),
    reviewCount: Number(row.reviewCount),
    lapseCount: Number(row.lapseCount),
  };
}

function publicMemoryDeck(row: MemoryDeckRow) {
  return {
    ...row,
    itemCount: Number(row.itemCount),
    dueCount: Number(row.dueCount),
  };
}

function publicMemoryPalace(row: MemoryPalaceRow, loci: MemoryLocusRow[] = []) {
  return {
    id: row.id,
    name: row.name,
    sceneType: row.sceneType,
    lociCount: Number(row.lociCount),
    imageUrl: assetUrl(row.imageKey),
    imagePrompt: row.imagePrompt,
    imageModel: row.imageModel,
    layout: parseMemoryLayout(row.layoutJson),
    generatedAt: row.generatedAt,
    createdAt: row.createdAt,
    loci: loci.map((locus) => ({
      ...locus,
      positionOrder: Number(locus.positionOrder),
    })),
  };
}

function publicMemoryLocus(locus: MemoryLocusRow) {
  return {
    ...locus,
    positionOrder: Number(locus.positionOrder),
  };
}

async function getOrCreateMemoryDeck(env: Env, user: SessionUserRow, name: string, description = ""): Promise<string> {
  const cleanName = normalizeMemoryText(name || "默认卡片", 40);
  const existing = await env.DB.prepare(
    "SELECT id FROM memory_decks WHERE user_id = ?1 AND name = ?2 LIMIT 1",
  ).bind(user.id, cleanName).first<{ id: string }>();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO memory_decks (id, user_id, name, description) VALUES (?1, ?2, ?3, ?4)",
  ).bind(id, user.id, cleanName, normalizeMemoryText(description, 120) || null).run();
  return id;
}

function validateAssetKey(key: string): boolean {
  return /^uploads\/(avatar|community|nutrition)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(jpe?g|png|webp|gif)$/.test(key)
    || /^generated\/memory\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\.(jpe?g|png|webp)$/.test(key);
}

function imageExtension(contentType: string): string | null {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return null;
  }
}

function safeOriginalName(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}._ -]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function readAssetKind(value: FormDataEntryValue | null): AssetKind | null {
  return value === "avatar" || value === "community" || value === "nutrition" ? value : null;
}

async function handleAsset(request: Request, env: Env, key: string): Promise<Response> {
  const objectKey = decodeURIComponent(key);
  if (!validateAssetKey(objectKey)) return error("图片地址无效。", 404);
  const object = await env.ASSETS_BUCKET.get(objectKey);
  if (!object) return error("没有找到这张图片。", 404);

  const headers = new Headers(publicAssetHeaders);
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("ETag", object.httpEtag);
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch && ifNoneMatch === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}

async function handleUploadAsset(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_IMAGE_UPLOAD_BYTES + 16_384) {
    return error("图片不能超过 4MB。", 413);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return error("图片上传内容无效。", 400);

  const kind = readAssetKind(form.get("kind"));
  const file = form.get("file");
  if (!kind) return error("图片用途无效。", 400);
  if (!(file instanceof File)) return error("请选择一张图片。", 400);
  if (file.size <= 0) return error("图片不能为空。", 400);
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) return error("图片不能超过 4MB。", 413);

  const extension = imageExtension(file.type);
  if (!extension) return error("仅支持 JPG、PNG、WebP 或 GIF 图片。", 400);

  const id = crypto.randomUUID();
  const objectKey = `uploads/${kind}/${user.id}/${id}.${extension}`;
  const bytes = await file.arrayBuffer();
  await env.ASSETS_BUCKET.put(objectKey, bytes, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: publicAssetHeaders["Cache-Control"],
    },
    customMetadata: {
      userId: user.id,
      kind,
    },
  });

  const originalName = safeOriginalName(file.name);
  const now = sqlTimestamp(new Date());
  try {
    await env.DB.prepare(
      `INSERT INTO asset_uploads
        (id, user_id, kind, object_key, content_type, byte_size, original_name, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)`,
    ).bind(id, user.id, kind, objectKey, file.type, file.size, originalName || null, now).run();

    if (kind === "avatar") {
      await env.DB.prepare(
        "UPDATE community_profiles SET avatar_asset_id = ?1, avatar_image_key = ?2, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?3",
      ).bind(id, objectKey, user.id).run();
    }
  } catch (cause) {
    await env.ASSETS_BUCKET.delete(objectKey).catch(() => undefined);
    console.error(JSON.stringify({ message: "asset metadata save failed", error: cause instanceof Error ? cause.message : String(cause) }));
    return error("图片没有保存成功，请稍后再试。", 500);
  }

  return json({
    asset: {
      id,
      kind,
      url: assetUrl(objectKey),
      contentType: file.type,
      byteSize: file.size,
      originalName: originalName || null,
      createdAt: now,
    },
  }, 201);
}

async function handleNutritionImages(env: Env, user: SessionUserRow): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT
      id,
      kind,
      object_key AS objectKey,
      content_type AS contentType,
      byte_size AS byteSize,
      original_name AS originalName,
      created_at AS createdAt
    FROM asset_uploads
    WHERE user_id = ?1 AND kind = 'nutrition' AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 24`,
  ).bind(user.id).all<AssetRow>();
  return json({ images: rows.results.map(publicAsset) });
}

function getArkConfig(env: Env): ArkConfig | null {
  const bindings = env as Env & ArkBindings;
  const apiKey = trimBinding(bindings.ARK_API_KEY);
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: trimBinding(bindings.ARK_BASE_URL) || ARK_DEFAULT_BASE_URL,
    imageModel: trimBinding(bindings.ARK_IMAGE_MODEL) || ARK_DEFAULT_IMAGE_MODEL,
    chatModel: trimBinding(bindings.ARK_CHAT_MODEL) || ARK_DEFAULT_CHAT_MODEL,
    imageSize: trimBinding(bindings.ARK_IMAGE_SIZE) || ARK_DEFAULT_IMAGE_SIZE,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = ARK_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callArkJson(config: ArkConfig, path: string, body: JsonObject): Promise<JsonObject> {
  const response = await fetchWithTimeout(`${config.baseUrl.replace(/\/+$/g, "")}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = parseJsonObject(text);
  if (!response.ok) {
    const message = typeof parsed?.message === "string"
      ? parsed.message
      : typeof parsed?.error === "string"
        ? parsed.error
        : `ark request failed with ${response.status}`;
    throw new Error(message);
  }
  if (!parsed) throw new Error("ark response is not json");
  return parsed;
}

function readArkChatContent(response: JsonObject): string {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = asObject(choices[0]);
  const message = asObject(firstChoice?.message);
  const content = message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        const object = asObject(part);
        return typeof object?.text === "string" ? object.text : "";
      })
      .join("")
      .trim();
  }
  return "";
}

async function callArkChat(config: ArkConfig, system: string, user: string): Promise<string> {
  const response = await callArkJson(config, "/chat/completions", {
    model: config.chatModel,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = readArkChatContent(response);
  if (!content) throw new Error("ark chat returned empty content");
  return content;
}

function readArkImageUrl(response: JsonObject): string {
  const data = Array.isArray(response.data) ? response.data : [];
  const first = asObject(data[0]);
  const url = typeof first?.url === "string" ? first.url : "";
  if (!/^https:\/\//i.test(url)) throw new Error("ark image response has no url");
  return url;
}

async function callArkImage(config: ArkConfig, prompt: string): Promise<string> {
  const response = await callArkJson(config, "/images/generations", {
    model: config.imageModel,
    prompt,
    sequential_image_generation: "disabled",
    response_format: "url",
    size: config.imageSize,
    stream: false,
    watermark: true,
  });
  return readArkImageUrl(response);
}

async function storeGeneratedImageFromUrl(env: Env, user: SessionUserRow, imageUrl: string): Promise<{ key: string; contentType: string; byteSize: number }> {
  const response = await fetchWithTimeout(imageUrl, { method: "GET" }, ARK_TIMEOUT_MS);
  if (!response.ok) throw new Error(`generated image download failed with ${response.status}`);

  const contentType = (response.headers.get("content-type") ?? "image/png").split(";")[0]?.trim().toLowerCase() || "image/png";
  const extension = imageExtension(contentType) ?? "png";
  const length = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > ARK_MAX_IMAGE_BYTES) throw new Error("generated image is too large");

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength <= 0) throw new Error("generated image is empty");
  if (bytes.byteLength > ARK_MAX_IMAGE_BYTES) throw new Error("generated image is too large");

  const key = `generated/memory/${user.id}/${crypto.randomUUID()}.${extension}`;
  await env.ASSETS_BUCKET.put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: publicAssetHeaders["Cache-Control"],
    },
    customMetadata: {
      userId: user.id,
      kind: "memory-palace",
      provider: "volcengine-ark",
    },
  });
  return { key, contentType, byteSize: bytes.byteLength };
}

function normalizeMemoryDrafts(value: unknown): MemoryCardDraft[] {
  const object = asObject(value);
  const rawCards = Array.isArray(object?.cards) ? object.cards : [];
  return rawCards
    .map((item): MemoryCardDraft | null => {
      const card = asObject(item);
      if (!card) return null;
      const prompt = normalizeMemoryText(typeof card.prompt === "string" ? card.prompt : "", 180);
      const answer = normalizeMemoryText(typeof card.answer === "string" ? card.answer : "", 1_000);
      if (prompt.length < 2 || answer.length < 1) return null;
      if ([
        "请填写",
        "请补充",
        "缺失",
        "填空",
        "__",
        "材料中第",
        "这段材料",
        "上述材料",
        "该材料",
        "本文",
        "具体内容",
        "核心信息",
        "涉及的主题",
        "乱码",
        "无法生成",
      ].some((word) => prompt.includes(word))) return null;
      const tags = Array.isArray(card.tags)
        ? card.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
        : parseMemoryTags(normalizeMemoryTags(typeof card.tags === "string" ? card.tags : "") ?? null);
      return { prompt, answer, tags: [...new Set(tags)].slice(0, 8) };
    })
    .filter((item): item is MemoryCardDraft => Boolean(item))
    .slice(0, 8);
}

function fallbackMemoryDrafts(source: string, count: number): MemoryCardDraft[] {
  const sentences = source
    .replace(/[！？!?]/g, "。")
    .split(/[\n。]+/g)
    .map((item) => normalizeMemoryText(item, 260))
    .filter((item) => item.length >= 8)
    .slice(0, 12);
  const drafts: MemoryCardDraft[] = [];
  const seen = new Set<string>();
  const delimiters = ["是指", "指的是", "是把", "是将", "是", "则把", "可以", "能够", "能", "会", "用于", "利用"];
  const trimConcept = (value: string) => {
    let result = value.trim();
    for (const mark of ["，", ",", "；", ";", "：", ":"]) {
      const index = result.lastIndexOf(mark);
      if (index >= 0) result = result.slice(index + 1).trim();
    }
    return result.slice(0, 24).trim();
  };

  for (const sentence of sentences) {
    let concept = "";
    let prompt = "";
    let matchedDelimiter = "";
    for (const delimiter of delimiters) {
      const index = sentence.indexOf(delimiter);
      if (index >= 2 && index <= 24) {
        concept = trimConcept(sentence.slice(0, index));
        matchedDelimiter = delimiter;
        break;
      }
    }
    if (concept && ["是指", "指的是", "是把", "是将", "是"].includes(matchedDelimiter)) {
      prompt = `什么是${concept}？`;
    } else if (concept) {
      prompt = `${concept}如何发挥作用？`;
    } else {
      concept = trimConcept(sentence.slice(0, 14));
      prompt = `如何用自己的话复述“${concept}”？`;
    }
    if (concept.length < 2 || seen.has(prompt)) continue;
    seen.add(prompt);
    drafts.push({
      prompt,
      answer: sentence,
      tags: [concept].slice(0, 1),
    });
    if (drafts.length >= count) break;
  }
  return drafts;
}

function fallbackPalaceLayout(palace: MemoryPalaceRow, loci: MemoryLocusRow[]): MemoryPalaceLayout {
  const positions = [
    [18, 34], [34, 22], [52, 32], [70, 24], [84, 42],
    [72, 64], [52, 74], [32, 66], [20, 52], [50, 50],
  ];
  return {
    viewpoint: "2.5D isometric",
    palette: ["#d4e6da", "#2f6b4f", "#f9fbf9", "#cbd8d0"],
    style: `${palace.name} 的护眼 2.5D 记忆宫殿空间图`,
    points: loci.slice(0, 10).map((locus, index) => {
      const [x, y] = positions[index % positions.length] ?? [50, 50];
      return {
        locusId: locus.id,
        title: locus.title,
        x,
        y,
        hint: locus.description ?? locus.prompt ?? "",
      };
    }),
  };
}

function buildPalaceImagePrompt(palace: MemoryPalaceRow, layout: MemoryPalaceLayout): string {
  const pointNames = layout.points.map((point, index) => `${index + 1}. ${point.title}`).join(" / ");
  return [
    "2.5D isometric memory palace map, calm wellness app aesthetic, eye-friendly Chinese color palette, soft moss green and warm off-white, premium minimal product design.",
    `Scene type: ${palace.sceneType}. Palace name: ${palace.name}.`,
    `Spatial route points: ${pointNames}.`,
    "Create a clean spatial background without readable text labels, no people, no clutter, clear paths, gentle light, rounded architecture, subtle depth, usable as an interactive learning map.",
    `Style note: ${layout.style}.`,
  ].join(" ");
}

async function handleGenerateMemoryCardDrafts(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const config = getArkConfig(env);
  if (!config) return error("火山方舟 API Key 还没有配置。", 503);
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const source = normalizeMemoryText(readString(body, "source"), MAX_AI_SOURCE_LENGTH);
  const count = clampInteger(Number(body.count), 2, 8, 5);
  const category = normalizeMemoryCategory(readString(body, "category"));
  if (source.length < 20) return error("请至少输入一小段可提炼的学习材料。", 400);

  const system = [
    "你是息间 App 的记忆训练产品助手。",
    "你的任务是把用户给的材料改写成主动回忆卡片。",
    "必须只返回 JSON，不要 Markdown，不要解释。",
    "JSON 结构：{\"cards\":[{\"prompt\":\"问题\",\"answer\":\"答案\",\"tags\":[\"标签\"]}]}。",
    "问题要适合闭卷回忆，答案要短、准确、可复述。不要编造材料之外的事实。",
    "不要生成填空题、选择题或“请填写缺失内容”式题目。prompt 必须是自然问题，例如“什么是……？”“为什么……？”“如何……？”。",
    "prompt 必须包含具体概念名，禁止出现“材料中第一条/第二条/上述材料/这段材料/本文”这类泛称。",
  ].join("\n");
  const prompt = [
    `请生成 ${count} 张记忆卡片。`,
    `默认类目：${category}。`,
    "材料如下：",
    source,
  ].join("\n\n");

  let content = "";
  try {
    content = await callArkChat(config, system, prompt);
  } catch (cause) {
    console.error(JSON.stringify({ message: "ark card draft failed", error: cause instanceof Error ? cause.message : String(cause) }));
    return error("AI 卡片生成暂时不可用，请稍后再试。", 502);
  }
  const parsed = parseJsonObject(content);
  let drafts = normalizeMemoryDrafts(parsed);
  if (drafts.length < Math.min(2, count)) {
    drafts = fallbackMemoryDrafts(source, count);
  }
  if (drafts.length === 0) {
    drafts = [{
      prompt: `如何用自己的话复述“${source.slice(0, 14)}”？`,
      answer: source.slice(0, 800),
      tags: ["AI提炼"],
    }];
  }
  if (drafts.length === 0) return error("AI 没有生成可用卡片，请换一段更清晰的材料。", 502);

  await env.DB.prepare(
    `INSERT INTO memory_ai_generations
      (id, user_id, kind, model, prompt, output_json)
    VALUES (?1, ?2, 'card-drafts', ?3, ?4, ?5)`,
  ).bind(crypto.randomUUID(), user.id, config.chatModel, prompt.slice(0, 2_000), JSON.stringify({ cards: drafts })).run();

  return json({ drafts });
}

async function handleGenerateMemoryPalaceView(palaceId: string, request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const config = getArkConfig(env);
  if (!config) return error("火山方舟 API Key 还没有配置。", 503);
  const palaceResult = await getMemoryPalaceById(env, user, palaceId);
  if (!palaceResult) return error("没有找到这个记忆宫殿。", 404);
  if (palaceResult.loci.length === 0) return error("请先给宫殿添加路径点。", 400);

  const body = await readBody(request).catch(() => null);
  const preference = normalizeMemoryText(body ? readString(body, "preference") : "", 180);
  const lociCopy = palaceResult.loci.map((locus) => ({
    locusId: locus.id,
    title: locus.title,
    order: locus.positionOrder,
    description: locus.description,
    cardPrompt: locus.prompt,
  }));
  const system = [
    "你是前沿 UI 设计师和记忆术教练。",
    "请为记忆宫殿生成一个可交互 2.5D 空间布局和文生图提示词。",
    "必须只返回 JSON，不要 Markdown，不要解释。",
    "JSON 结构：{\"viewpoint\":\"视角\",\"palette\":[\"#色值\"],\"style\":\"风格\",\"imagePrompt\":\"英文文生图提示词\",\"points\":[{\"locusId\":\"原ID\",\"title\":\"地点名\",\"x\":数字0到100,\"y\":数字0到100,\"hint\":\"短提示\"}]}。",
    "不要让图片模型生成文字标签，文字由前端叠加。坐标需要形成清晰路线，不要重叠。",
  ].join("\n");
  const prompt = [
    `宫殿名：${palaceResult.palace.name}`,
    `场景类型：${palaceResult.palace.sceneType}`,
    preference ? `用户偏好：${preference}` : "用户偏好：护眼、克制、高级、不花哨。",
    "路径点 JSON：",
    JSON.stringify(lociCopy),
  ].join("\n\n");

  let chatContent = "";
  try {
    chatContent = await callArkChat(config, system, prompt);
  } catch (cause) {
    console.error(JSON.stringify({ message: "ark palace layout failed", error: cause instanceof Error ? cause.message : String(cause) }));
    return error("AI 空间布局生成暂时不可用，请稍后再试。", 502);
  }

  const parsed = parseJsonObject(chatContent);
  const layout = parseMemoryLayout(parsed ? JSON.stringify(parsed) : null) ?? fallbackPalaceLayout(palaceResult.palace, palaceResult.loci);
  const rawImagePrompt = parsed && typeof parsed.imagePrompt === "string"
    ? normalizeMemoryText(parsed.imagePrompt, 1_600)
    : "";
  const imagePrompt = rawImagePrompt || buildPalaceImagePrompt(palaceResult.palace, layout);

  let imageUrl = "";
  let stored: { key: string; contentType: string; byteSize: number };
  try {
    imageUrl = await callArkImage(config, imagePrompt);
    stored = await storeGeneratedImageFromUrl(env, user, imageUrl);
  } catch (cause) {
    console.error(JSON.stringify({ message: "ark palace image failed", error: cause instanceof Error ? cause.message : String(cause) }));
    return error("AI 空间图生成暂时不可用，请稍后再试。", 502);
  }

  const now = sqlTimestamp(new Date());
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE memory_palaces
      SET image_key = ?1,
        image_prompt = ?2,
        image_model = ?3,
        layout_json = ?4,
        generated_at = ?5,
        updated_at = ?5
      WHERE id = ?6 AND user_id = ?7`,
    ).bind(stored.key, imagePrompt, config.imageModel, JSON.stringify(layout), now, palaceId, user.id),
    env.DB.prepare(
      `INSERT INTO memory_ai_generations
        (id, user_id, kind, palace_id, model, prompt, output_key, output_json)
      VALUES (?1, ?2, 'palace-view', ?3, ?4, ?5, ?6, ?7)`,
    ).bind(
      crypto.randomUUID(),
      user.id,
      palaceId,
      `${config.chatModel}+${config.imageModel}`,
      imagePrompt.slice(0, 2_000),
      stored.key,
      JSON.stringify({ layout, imageUrlUsed: Boolean(imageUrl), byteSize: stored.byteSize, contentType: stored.contentType }),
    ),
  ]);

  const updated = await getMemoryPalaceById(env, user, palaceId);
  return json({ palace: updated ? publicMemoryPalace(updated.palace, updated.loci) : null });
}

const memoryItemSelect = `
  i.id,
  i.deck_id AS deckId,
  d.name AS deckName,
  i.prompt,
  i.answer,
  i.category,
  i.tags,
  i.status,
  i.ease_factor AS easeFactor,
  i.interval_days AS intervalDays,
  i.review_count AS reviewCount,
  i.lapse_count AS lapseCount,
  i.next_review_at AS nextReviewAt,
  i.last_reviewed_at AS lastReviewedAt,
  i.created_at AS createdAt,
  i.updated_at AS updatedAt
`;

const palaceTemplates: Record<string, Array<[string, string]>> = {
  home: [
    ["玄关", "进门第一眼看到的位置，用来放最重要的概念。"],
    ["窗边", "把需要辨认的细节放在有光的位置。"],
    ["书桌", "适合放公式、步骤和定义。"],
    ["书架", "适合按分类摆放一组知识。"],
    ["床头", "放临睡前想快速回忆的内容。"],
  ],
  route: [
    ["出发点", "把主题放在路线开始处。"],
    ["第一个路口", "放第一个分支或关键问题。"],
    ["树下", "放容易混淆的例外。"],
    ["长椅", "放需要停下来复述的内容。"],
    ["终点", "放总结或输出任务。"],
  ],
  garden: [
    ["门廊", "作为主题入口。"],
    ["石径", "按顺序铺开步骤。"],
    ["水池", "放需要冷静辨认的知识点。"],
    ["花架", "放同类内容的对比。"],
    ["亭子", "放最后的复盘问题。"],
  ],
  body: [
    ["头顶", "放总标题或核心问题。"],
    ["眼睛", "放需要观察的细节。"],
    ["双手", "放操作步骤。"],
    ["胸口", "放情绪或意义联想。"],
    ["脚下", "放结论和下一步行动。"],
  ],
};

function normalizeMemorySceneType(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "").slice(0, 24);
  return Object.prototype.hasOwnProperty.call(palaceTemplates, normalized) ? normalized : "home";
}

function readMemoryTags(body: JsonObject): string | null {
  const value = body.tags;
  if (Array.isArray(value)) {
    return normalizeMemoryTags(value.filter((item): item is string => typeof item === "string").join(","));
  }
  return normalizeMemoryTags(readString(body, "tags"));
}

async function getMemorySummary(env: Env, user: SessionUserRow): Promise<MemorySummary> {
  const today = localDate(user.timezone);
  const weekStart = daysAgoDate(6, user.timezone);
  const [itemResult, todayResult, weekResult, recentResult] = await env.DB.batch<{
    totalItems?: number;
    dueCount?: number | null;
    reviewedToday?: number;
    rememberedToday?: number | null;
    forgottenToday?: number | null;
    totalReviews?: number;
    rememberedReviews?: number | null;
    localDate?: string;
  }>([
    env.DB.prepare(
      `SELECT
        COUNT(*) AS totalItems,
        SUM(CASE WHEN next_review_at <= datetime('now') THEN 1 ELSE 0 END) AS dueCount
      FROM memory_items
      WHERE user_id = ?1 AND status = 'active'`,
    ).bind(user.id),
    env.DB.prepare(
      `SELECT
        COUNT(*) AS reviewedToday,
        SUM(CASE WHEN rating >= 2 THEN 1 ELSE 0 END) AS rememberedToday,
        SUM(CASE WHEN rating = 0 THEN 1 ELSE 0 END) AS forgottenToday
      FROM memory_reviews
      WHERE user_id = ?1 AND local_date = ?2`,
    ).bind(user.id, today),
    env.DB.prepare(
      `SELECT
        COUNT(*) AS totalReviews,
        SUM(CASE WHEN rating >= 2 THEN 1 ELSE 0 END) AS rememberedReviews
      FROM memory_reviews
      WHERE user_id = ?1 AND local_date >= ?2`,
    ).bind(user.id, weekStart),
    env.DB.prepare(
      `SELECT DISTINCT local_date AS localDate
      FROM memory_sessions
      WHERE user_id = ?1 AND local_date >= ?2
      ORDER BY local_date ASC`,
    ).bind(user.id, weekStart),
  ]);

  const itemStats = itemResult.results[0] ?? {};
  const todayStats = todayResult.results[0] ?? {};
  const weekStats = weekResult.results[0] ?? {};
  const totalReviews = Number(weekStats.totalReviews ?? 0);
  const rememberedReviews = Number(weekStats.rememberedReviews ?? 0);
  const recentDates = recentResult.results
    .map((row) => row.localDate)
    .filter((value): value is string => typeof value === "string");

  const streakRows = await env.DB.prepare(
    `SELECT DISTINCT local_date AS localDate
    FROM memory_sessions
    WHERE user_id = ?1
    ORDER BY local_date DESC
    LIMIT 366`,
  ).bind(user.id).all<{ localDate: string }>();
  const completed = new Set(streakRows.results.map((row) => row.localDate));
  let streak = 0;
  for (let offset = 0; offset < 366; offset += 1) {
    if (!completed.has(daysAgoDate(offset, user.timezone))) break;
    streak += 1;
  }

  return {
    totalItems: Number(itemStats.totalItems ?? 0),
    dueCount: Number(itemStats.dueCount ?? 0),
    reviewedToday: Number(todayStats.reviewedToday ?? 0),
    rememberedToday: Number(todayStats.rememberedToday ?? 0),
    forgottenToday: Number(todayStats.forgottenToday ?? 0),
    retention7d: totalReviews > 0 ? Math.round((rememberedReviews / totalReviews) * 100) : 0,
    streak,
    recentDates,
  };
}

async function getMemoryDeckById(env: Env, user: SessionUserRow, deckId: string): Promise<MemoryDeckRow | null> {
  return env.DB.prepare(
    `SELECT
      d.id,
      d.name,
      d.description,
      COUNT(i.id) AS itemCount,
      SUM(CASE WHEN i.next_review_at <= datetime('now') THEN 1 ELSE 0 END) AS dueCount,
      d.created_at AS createdAt
    FROM memory_decks d
    LEFT JOIN memory_items i ON i.deck_id = d.id AND i.status = 'active'
    WHERE d.id = ?1 AND d.user_id = ?2
    GROUP BY d.id
    LIMIT 1`,
  ).bind(deckId, user.id).first<MemoryDeckRow>();
}

async function getMemoryItemById(env: Env, user: SessionUserRow, itemId: string): Promise<MemoryItemRow | null> {
  return env.DB.prepare(
    `SELECT ${memoryItemSelect}
    FROM memory_items i
    LEFT JOIN memory_decks d ON d.id = i.deck_id
    WHERE i.id = ?1 AND i.user_id = ?2
    LIMIT 1`,
  ).bind(itemId, user.id).first<MemoryItemRow>();
}

async function handleMemoryDecks(env: Env, user: SessionUserRow): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT
      d.id,
      d.name,
      d.description,
      COUNT(i.id) AS itemCount,
      SUM(CASE WHEN i.next_review_at <= datetime('now') THEN 1 ELSE 0 END) AS dueCount,
      d.created_at AS createdAt
    FROM memory_decks d
    LEFT JOIN memory_items i ON i.deck_id = d.id AND i.status = 'active'
    WHERE d.user_id = ?1
    GROUP BY d.id
    ORDER BY d.created_at DESC
    LIMIT 50`,
  ).bind(user.id).all<MemoryDeckRow>();
  return json({ decks: rows.results.map(publicMemoryDeck) });
}

async function handleCreateMemoryDeck(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const name = normalizeMemoryText(readString(body, "name"), 40);
  const description = normalizeMemoryText(readString(body, "description"), 160);
  if (name.length < 2) return error("卡组名称至少需要 2 个字。", 400);

  const deckId = await getOrCreateMemoryDeck(env, user, name, description);
  const deck = await getMemoryDeckById(env, user, deckId);
  return json({ deck: deck ? publicMemoryDeck(deck) : null }, 201);
}

async function handleMemoryItems(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "80");
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 120) : 80;
  const deckId = url.searchParams.get("deckId")?.trim();
  const params: Array<string | number> = [user.id];
  const conditions = ["i.user_id = ?", "i.status = 'active'"];
  if (deckId) {
    conditions.push("i.deck_id = ?");
    params.push(deckId);
  }
  params.push(limit);

  const rows = await env.DB.prepare(
    `SELECT ${memoryItemSelect}
    FROM memory_items i
    LEFT JOIN memory_decks d ON d.id = i.deck_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY i.created_at DESC, i.id DESC
    LIMIT ?`,
  ).bind(...params).all<MemoryItemRow>();
  return json({ items: rows.results.map(publicMemoryItem) });
}

async function handleDueMemoryItems(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 60) : 20;
  const rows = await env.DB.prepare(
    `SELECT ${memoryItemSelect}
    FROM memory_items i
    LEFT JOIN memory_decks d ON d.id = i.deck_id
    WHERE i.user_id = ?1 AND i.status = 'active' AND i.next_review_at <= datetime('now')
    ORDER BY i.next_review_at ASC, i.created_at ASC
    LIMIT ?2`,
  ).bind(user.id, limit).all<MemoryItemRow>();
  return json({ items: rows.results.map(publicMemoryItem), summary: await getMemorySummary(env, user) });
}

async function handleCreateMemoryItem(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const prompt = normalizeMemoryText(readString(body, "prompt"), 180);
  const answer = normalizeMemoryText(readString(body, "answer"), 1_000);
  const category = normalizeMemoryCategory(readString(body, "category"));
  const tags = readMemoryTags(body);
  if (prompt.length < 2 || prompt.length > 180) return error("问题需要控制在 2 到 180 个字之间。", 400);
  if (answer.length < 1 || answer.length > 1_000) return error("答案需要控制在 1 到 1000 个字之间。", 400);

  const requestedDeckId = readString(body, "deckId");
  let deckId = "";
  if (requestedDeckId) {
    const deck = await env.DB.prepare(
      "SELECT id FROM memory_decks WHERE id = ?1 AND user_id = ?2 LIMIT 1",
    ).bind(requestedDeckId, user.id).first<{ id: string }>();
    if (!deck) return error("没有找到这个记忆卡组。", 404);
    deckId = deck.id;
  } else {
    deckId = await getOrCreateMemoryDeck(env, user, readString(body, "deckName") || "默认卡片");
  }

  const id = crypto.randomUUID();
  const now = sqlTimestamp(new Date());
  await env.DB.prepare(
    `INSERT INTO memory_items
      (id, user_id, deck_id, prompt, answer, category, tags, next_review_at, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?8)`,
  ).bind(id, user.id, deckId, prompt, answer, category, tags, now).run();

  const item = await getMemoryItemById(env, user, id);
  return json({ item: item ? publicMemoryItem(item) : null, summary: await getMemorySummary(env, user) }, 201);
}

async function handleDeleteMemoryItem(itemId: string, env: Env, user: SessionUserRow): Promise<Response> {
  const existing = await env.DB.prepare(
    "SELECT id FROM memory_items WHERE id = ?1 AND user_id = ?2 AND status = 'active' LIMIT 1",
  ).bind(itemId, user.id).first<{ id: string }>();
  if (!existing) return error("没有找到可归档的记忆卡片。", 404);

  await env.DB.prepare(
    "UPDATE memory_items SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND user_id = ?2",
  ).bind(itemId, user.id).run();
  return new Response(null, { status: 204, headers: apiHeaders });
}

async function handleMemoryReview(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const itemId = readString(body, "itemId");
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 0 || rating > 3) return error("复习反馈无效。", 400);

  const item = await getMemoryItemById(env, user, itemId);
  if (!item || item.status !== "active") return error("没有找到这张记忆卡片。", 404);

  const rawResponseMs = Number(body.responseMs);
  const responseMs = Number.isInteger(rawResponseMs) && rawResponseMs >= 0 && rawResponseMs <= 600_000
    ? rawResponseMs
    : null;
  let sessionId: string | null = readString(body, "sessionId") || null;
  if (sessionId) {
    const session = await env.DB.prepare(
      "SELECT id FROM memory_sessions WHERE id = ?1 AND user_id = ?2 LIMIT 1",
    ).bind(sessionId, user.id).first<{ id: string }>();
    sessionId = session?.id ?? null;
  }

  const scheduled = scheduleMemoryReview(item, rating);
  const reviewId = crypto.randomUUID();
  const now = sqlTimestamp(new Date());
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO memory_reviews
        (id, user_id, item_id, session_id, rating, response_ms, local_date, reviewed_at, next_review_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    ).bind(reviewId, user.id, item.id, sessionId, rating, responseMs, localDate(user.timezone), now, scheduled.nextReviewAt),
    env.DB.prepare(
      `UPDATE memory_items
      SET ease_factor = ?1,
        interval_days = ?2,
        review_count = review_count + 1,
        lapse_count = ?3,
        next_review_at = ?4,
        last_reviewed_at = ?5,
        updated_at = ?5
      WHERE id = ?6 AND user_id = ?7`,
    ).bind(scheduled.easeFactor, scheduled.intervalDays, scheduled.lapseCount, scheduled.nextReviewAt, now, item.id, user.id),
  ]);

  const updatedItem = await getMemoryItemById(env, user, item.id);
  return json({
    review: { id: reviewId, rating, nextReviewAt: scheduled.nextReviewAt },
    item: updatedItem ? publicMemoryItem(updatedItem) : null,
    summary: await getMemorySummary(env, user),
  }, 201);
}

async function handleMemorySessionComplete(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const rawMode = normalizeMemoryCategory(readString(body, "mode"));
  const mode = ["recall", "palace", "mixed"].includes(rawMode) ? rawMode : "recall";
  const itemCount = clampInteger(Number(body.itemCount), 0, 200, 0);
  const rememberedCount = clampInteger(Number(body.rememberedCount), 0, itemCount, 0);
  const forgottenCount = clampInteger(Number(body.forgottenCount), 0, itemCount, 0);
  const durationSec = clampInteger(Number(body.durationSec), 0, 7200, 0);
  const clientSessionId = readString(body, "clientSessionId");
  if (clientSessionId.length < 8 || clientSessionId.length > 120) return error("训练标识无效。", 400);

  const existing = await env.DB.prepare(
    `SELECT
      id,
      mode,
      item_count AS itemCount,
      remembered_count AS rememberedCount,
      forgotten_count AS forgottenCount,
      duration_sec AS durationSec,
      local_date AS localDate,
      created_at AS createdAt
    FROM memory_sessions
    WHERE user_id = ?1 AND client_session_id = ?2
    LIMIT 1`,
  ).bind(user.id, clientSessionId).first<MemorySessionRow>();
  if (existing) return json({ session: existing, summary: await getMemorySummary(env, user) });

  const id = crypto.randomUUID();
  const date = localDate(user.timezone);
  const now = sqlTimestamp(new Date());
  await env.DB.prepare(
    `INSERT INTO memory_sessions
      (id, user_id, mode, item_count, remembered_count, forgotten_count, duration_sec, client_session_id, local_date, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  ).bind(id, user.id, mode, itemCount, rememberedCount, forgottenCount, durationSec, clientSessionId, date, now).run();

  return json({
    session: {
      id,
      mode,
      itemCount,
      rememberedCount,
      forgottenCount,
      durationSec,
      localDate: date,
      createdAt: now,
    },
    summary: await getMemorySummary(env, user),
  }, 201);
}

async function getMemoryPalaceById(env: Env, user: SessionUserRow, palaceId: string): Promise<{ palace: MemoryPalaceRow; loci: MemoryLocusRow[] } | null> {
  const palace = await env.DB.prepare(
    `SELECT
      p.id,
      p.name,
      p.scene_type AS sceneType,
      p.image_key AS imageKey,
      p.image_prompt AS imagePrompt,
      p.image_model AS imageModel,
      p.layout_json AS layoutJson,
      p.generated_at AS generatedAt,
      COUNT(l.id) AS lociCount,
      p.created_at AS createdAt
    FROM memory_palaces p
    LEFT JOIN memory_loci l ON l.palace_id = p.id
    WHERE p.id = ?1 AND p.user_id = ?2
    GROUP BY p.id
    LIMIT 1`,
  ).bind(palaceId, user.id).first<MemoryPalaceRow>();
  if (!palace) return null;

  const loci = await env.DB.prepare(
    `SELECT
      l.id,
      l.palace_id AS palaceId,
      l.title,
      l.position_order AS positionOrder,
      l.description,
      l.item_id AS itemId,
      i.prompt,
      l.created_at AS createdAt
    FROM memory_loci l
    LEFT JOIN memory_items i ON i.id = l.item_id AND i.user_id = ?1
    WHERE l.palace_id = ?2
    ORDER BY l.position_order ASC, l.created_at ASC`,
  ).bind(user.id, palace.id).all<MemoryLocusRow>();

  return { palace, loci: loci.results };
}

async function handleMemoryPalaces(env: Env, user: SessionUserRow): Promise<Response> {
  const palaceRows = await env.DB.prepare(
    `SELECT
      p.id,
      p.name,
      p.scene_type AS sceneType,
      p.image_key AS imageKey,
      p.image_prompt AS imagePrompt,
      p.image_model AS imageModel,
      p.layout_json AS layoutJson,
      p.generated_at AS generatedAt,
      COUNT(l.id) AS lociCount,
      p.created_at AS createdAt
    FROM memory_palaces p
    LEFT JOIN memory_loci l ON l.palace_id = p.id
    WHERE p.user_id = ?1
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT 20`,
  ).bind(user.id).all<MemoryPalaceRow>();

  const palaces = palaceRows.results;
  if (palaces.length === 0) return json({ palaces: [] });

  const placeholders = palaces.map(() => "?").join(",");
  const locusRows = await env.DB.prepare(
    `SELECT
      l.id,
      l.palace_id AS palaceId,
      l.title,
      l.position_order AS positionOrder,
      l.description,
      l.item_id AS itemId,
      i.prompt,
      l.created_at AS createdAt
    FROM memory_loci l
    LEFT JOIN memory_items i ON i.id = l.item_id AND i.user_id = ?
    WHERE l.palace_id IN (${placeholders})
    ORDER BY l.position_order ASC, l.created_at ASC`,
  ).bind(user.id, ...palaces.map((palace) => palace.id)).all<MemoryLocusRow>();

  const lociByPalace = new Map<string, MemoryLocusRow[]>();
  for (const locus of locusRows.results) {
    if (!locus.palaceId) continue;
    const items = lociByPalace.get(locus.palaceId) ?? [];
    items.push(locus);
    lociByPalace.set(locus.palaceId, items);
  }

  return json({
    palaces: palaces.map((palace) => publicMemoryPalace(palace, lociByPalace.get(palace.id) ?? [])),
  });
}

async function handleCreateMemoryPalace(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const name = normalizeMemoryText(readString(body, "name"), 40);
  if (name.length < 2) return error("宫殿名称至少需要 2 个字。", 400);
  const sceneType = normalizeMemorySceneType(readString(body, "sceneType"));
  const useTemplate = body.useTemplate !== false;
  const id = crypto.randomUUID();

  const statements = [
    env.DB.prepare(
      "INSERT INTO memory_palaces (id, user_id, name, scene_type) VALUES (?1, ?2, ?3, ?4)",
    ).bind(id, user.id, name, sceneType),
  ];
  if (useTemplate) {
    for (const [index, [title, description]] of (palaceTemplates[sceneType] ?? palaceTemplates.home).entries()) {
      statements.push(env.DB.prepare(
        "INSERT INTO memory_loci (id, palace_id, title, position_order, description) VALUES (?1, ?2, ?3, ?4, ?5)",
      ).bind(crypto.randomUUID(), id, title, index + 1, description));
    }
  }
  await env.DB.batch(statements);

  const palace = await getMemoryPalaceById(env, user, id);
  return json({ palace: palace ? publicMemoryPalace(palace.palace, palace.loci) : null }, 201);
}

async function handleCreateMemoryLocus(palaceId: string, request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const palace = await env.DB.prepare(
    "SELECT id FROM memory_palaces WHERE id = ?1 AND user_id = ?2 LIMIT 1",
  ).bind(palaceId, user.id).first<{ id: string }>();
  if (!palace) return error("没有找到这个记忆宫殿。", 404);

  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const title = normalizeMemoryText(readString(body, "title"), 40);
  const description = normalizeMemoryText(readString(body, "description"), 240);
  if (title.length < 1) return error("地点名称不能为空。", 400);

  let itemId: string | null = readString(body, "itemId") || null;
  if (itemId) {
    const item = await env.DB.prepare(
      "SELECT id FROM memory_items WHERE id = ?1 AND user_id = ?2 AND status = 'active' LIMIT 1",
    ).bind(itemId, user.id).first<{ id: string }>();
    itemId = item?.id ?? null;
    if (!itemId) return error("没有找到可绑定的记忆卡片。", 404);
  }

  const maxOrder = await env.DB.prepare(
    "SELECT MAX(position_order) AS maxOrder FROM memory_loci WHERE palace_id = ?1",
  ).bind(palaceId).first<{ maxOrder: number | null }>();
  const requestedOrder = Number(body.positionOrder);
  const positionOrder = Number.isInteger(requestedOrder) && requestedOrder > 0
    ? Math.min(requestedOrder, 999)
    : Number(maxOrder?.maxOrder ?? 0) + 1;

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO memory_loci (id, palace_id, title, position_order, description, item_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  ).bind(id, palaceId, title, positionOrder, description || null, itemId).run();

  const locus = await env.DB.prepare(
    `SELECT
      l.id,
      l.palace_id AS palaceId,
      l.title,
      l.position_order AS positionOrder,
      l.description,
      l.item_id AS itemId,
      i.prompt,
      l.created_at AS createdAt
    FROM memory_loci l
    LEFT JOIN memory_items i ON i.id = l.item_id AND i.user_id = ?1
    WHERE l.id = ?2
    LIMIT 1`,
  ).bind(user.id, id).first<MemoryLocusRow>();
  return json({ locus: locus ? publicMemoryLocus(locus) : null }, 201);
}

function trimBinding(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function getXfyunTtsConfig(env: Env): XfyunTtsConfig | null {
  const bindings = env as Env & XfyunTtsBindings;
  const appId = trimBinding(bindings.XFYUN_TTS_APP_ID);
  const apiPassword = trimBinding(bindings.XFYUN_TTS_API_PASSWORD);
  const apiKey = trimBinding(bindings.XFYUN_TTS_API_KEY);
  const apiSecret = trimBinding(bindings.XFYUN_TTS_API_SECRET);
  if (!appId || (!apiPassword && (!apiKey || !apiSecret))) return null;

  return {
    appId,
    apiPassword,
    apiKey,
    apiSecret,
    endpoint: trimBinding(bindings.XFYUN_TTS_URL) || XFYUN_TTS_DEFAULT_URL,
    voice: trimBinding(bindings.XFYUN_TTS_VOICE) || XFYUN_TTS_DEFAULT_VOICE,
    oralLevel: trimBinding(bindings.XFYUN_TTS_ORAL_LEVEL) || XFYUN_TTS_DEFAULT_ORAL_LEVEL,
  };
}

function buildXfyunTtsPayload(config: XfyunTtsConfig, text: string): JsonObject {
  return {
    header: {
      app_id: config.appId,
      status: 2,
    },
    parameter: {
      oral: {
        oral_level: config.oralLevel,
      },
      tts: {
        vcn: config.voice,
        speed: 48,
        volume: 68,
        pitch: 50,
        bgs: 0,
        reg: 0,
        rdn: 0,
        rhy: 0,
        audio: {
          encoding: "lame",
          sample_rate: 24000,
          channels: 1,
          bit_depth: 16,
          frame_size: 0,
        },
      },
    },
    payload: {
      text: {
        encoding: "utf8",
        compress: "raw",
        format: "plain",
        status: 2,
        seq: 0,
        text: stringToBase64(text),
      },
    },
  };
}

async function signXfyunWebSocketUrl(endpoint: string, apiKey: string, apiSecret: string): Promise<string> {
  const url = new URL(endpoint);
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${url.host}\ndate: ${date}\nGET ${url.pathname} HTTP/1.1`;
  const signature = await hmacSha256Base64(apiSecret, signatureOrigin);
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  url.searchParams.set("host", url.host);
  url.searchParams.set("date", date);
  url.searchParams.set("authorization", stringToBase64(authorizationOrigin));
  return url.toString();
}

function websocketUrlToFetchUrl(endpoint: string): string {
  const url = new URL(endpoint);
  if (url.protocol === "wss:") url.protocol = "https:";
  if (url.protocol === "ws:") url.protocol = "http:";
  return url.toString();
}

async function connectXfyunWebSocket(config: XfyunTtsConfig): Promise<WebSocket> {
  const endpoint = config.apiPassword
    ? config.endpoint
    : await signXfyunWebSocketUrl(config.endpoint, config.apiKey, config.apiSecret);
  const headers = new Headers({ Upgrade: "websocket" });
  if (config.apiPassword) headers.set("x-api-key", config.apiPassword);

  const response = await fetch(websocketUrlToFetchUrl(endpoint), { method: "GET", headers });
  const webSocket = response.webSocket;
  if (response.status !== 101 || !webSocket) {
    throw new Error(`xunfei websocket failed with status ${response.status}`);
  }
  webSocket.accept();
  return webSocket;
}

function parseXfyunMessage(data: string | ArrayBuffer): XfyunTtsResponse {
  const text = typeof data === "string" ? data : decoder.decode(data);
  const parsed = JSON.parse(text) as unknown;
  return asObject(parsed) as XfyunTtsResponse;
}

async function synthesizeWithXfyun(config: XfyunTtsConfig, text: string): Promise<Uint8Array<ArrayBuffer>> {
  const webSocket = await connectXfyunWebSocket(config);
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      webSocket.removeEventListener("message", onMessage);
      webSocket.removeEventListener("close", onClose);
      webSocket.removeEventListener("error", onError);
      callback();
    };

    const fail = (cause: unknown) => {
      finish(() => {
        try {
          webSocket.close(1011, "tts failed");
        } catch {
          // Closing is best-effort after an upstream error.
        }
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      });
    };

    const timer = setTimeout(() => fail(new Error("xunfei tts timeout")), XFYUN_TTS_TIMEOUT_MS);

    const onMessage = (event: MessageEvent<string | ArrayBuffer>) => {
      try {
        const message = parseXfyunMessage(event.data);
        const code = Number(message.header?.code ?? 0);
        if (code !== 0) {
          fail(new Error(message.header?.message || `xunfei tts error ${code}`));
          return;
        }

        const audio = message.payload?.audio?.audio;
        if (audio) {
          chunks.push(base64ToBytes(audio));
          const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
          if (size > XFYUN_TTS_MAX_AUDIO_BYTES) {
            fail(new Error("xunfei tts response too large"));
            return;
          }
        }

        const status = Number(message.payload?.audio?.status ?? message.header?.status ?? 0);
        if (status === 2) {
          finish(() => {
            try {
              webSocket.close(1000, "tts complete");
            } catch {
              // Closing is best-effort after a successful response.
            }
            resolve(concatBytes(chunks));
          });
        }
      } catch (cause) {
        fail(cause);
      }
    };

    const onClose = () => fail(new Error("xunfei websocket closed before completion"));
    const onError = () => fail(new Error("xunfei websocket error"));

    webSocket.addEventListener("message", onMessage);
    webSocket.addEventListener("close", onClose);
    webSocket.addEventListener("error", onError);
    webSocket.send(JSON.stringify(buildXfyunTtsPayload(config, text)));
  });
}

async function ttsCacheKey(config: XfyunTtsConfig, phase: TrainingSpeechPhase, text: string): Promise<string> {
  const digest = await sha256Hex(JSON.stringify({
    provider: "xfyun-super-tts",
    version: 1,
    phase,
    text,
    voice: config.voice,
    oralLevel: config.oralLevel,
    sampleRate: 24000,
    encoding: "lame",
  }));
  return `tts/xfyun-super/${digest}.mp3`;
}

async function handleTrainingSpeech(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const phase = url.searchParams.get("phase");
  if (phase !== "left" && phase !== "switch" && phase !== "right" && phase !== "relax") {
    return error("语音阶段无效。", 400);
  }

  const config = getXfyunTtsConfig(env);
  if (!config) {
    return error("讯飞语音暂未配置。", 503);
  }

  const text = trainingSpeechCopy[phase];
  const key = await ttsCacheKey(config, phase, text);
  const cached = await env.ASSETS_BUCKET.get(key);
  if (cached?.body) {
    return new Response(cached.body, {
      headers: { ...audioHeaders, "X-TTS-Cache": "HIT", "X-TTS-Voice": config.voice },
    });
  }

  let audio: Uint8Array<ArrayBuffer>;
  try {
    audio = await synthesizeWithXfyun(config, text);
  } catch (cause) {
    console.error(JSON.stringify({
      message: "xfyun tts synthesis failed",
      phase,
      error: cause instanceof Error ? cause.message : String(cause),
    }));
    return error("讯飞语音合成暂不可用，已自动使用备用语音。", 502);
  }

  await env.ASSETS_BUCKET.put(key, audio, {
    httpMetadata: {
      contentType: "audio/mpeg",
      cacheControl: audioHeaders["Cache-Control"],
    },
    customMetadata: {
      provider: "xfyun-super-tts",
      phase,
      voice: config.voice,
    },
  });

  return new Response(audio, {
    headers: { ...audioHeaders, "X-TTS-Cache": "MISS", "X-TTS-Voice": config.voice },
  });
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const email = readString(body, "email").toLowerCase();
  const password = readString(body, "password");
  const displayName = readString(body, "displayName");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("请输入有效邮箱。", 400);
  if (password.length < 8 || password.length > 72) return error("密码长度需要在 8 到 72 位之间。", 400);
  if (displayName.length < 2 || displayName.length > 20) return error("昵称长度需要在 2 到 20 个字符之间。", 400);

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1 LIMIT 1").bind(email).first();
  if (existing) return error("这个邮箱已经注册，请直接登录。", 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const avatarCode = avatarFromId(id);
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO users (id, email, password_hash, display_name) VALUES (?1, ?2, ?3, ?4)",
      ).bind(id, email, passwordHash, displayName),
      env.DB.prepare(
        "INSERT INTO community_profiles (user_id, nickname, avatar_code, visibility) VALUES (?1, ?2, ?3, 'private')",
      ).bind(id, displayName, avatarCode),
    ]);
    const token = await createSession(env, id);
    return json({ ok: true }, 201, { "Set-Cookie": sessionCookie(token, request) });
  } catch (cause) {
    console.error(JSON.stringify({ message: "registration failed", error: cause instanceof Error ? cause.message : String(cause) }));
    return error("注册没有成功，请稍后再试。", 500);
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const email = readString(body, "email").toLowerCase();
  const password = readString(body, "password");
  const user = await env.DB.prepare(
    "SELECT id, password_hash AS passwordHash FROM users WHERE email = ?1 AND status = 'active' LIMIT 1",
  )
    .bind(email)
    .first<{ id: string; passwordHash: string | null }>();
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return error("邮箱或密码不正确。", 401);
  }
  const token = await createSession(env, user.id);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, request) });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = getCookie(request, "xijian_session");
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
}

async function handleTrainingComplete(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const durationSec = Number(body.durationSec);
  const clientSessionId = readString(body, "clientSessionId");
  if (!Number.isInteger(durationSec) || durationSec < 30 || durationSec > 900) return error("训练时长无效。", 400);
  if (clientSessionId.length < 8 || clientSessionId.length > 80) return error("训练标识无效。", 400);

  const existingSession = await env.DB.prepare(
    `SELECT c.id, c.local_date AS localDate, c.product_code AS productCode,
      c.duration_sec AS durationSec, c.created_at AS createdAt,
      EXISTS(SELECT 1 FROM community_posts p WHERE p.checkin_id = c.id) AS shared
    FROM training_sessions t
    JOIN checkins c ON c.training_session_id = t.id
    WHERE t.user_id = ?1 AND t.client_session_id = ?2
    LIMIT 1`,
  )
    .bind(user.id, clientSessionId)
    .first<CheckinRow>();
  if (existingSession) {
    return json({ checkin: { ...existingSession, shared: Boolean(existingSession.shared) }, summary: await getSummary(env, user) });
  }

  const date = localDate(user.timezone);
  const existingToday = await env.DB.prepare(
    `SELECT c.id, c.local_date AS localDate, c.product_code AS productCode,
      c.duration_sec AS durationSec, c.created_at AS createdAt,
      EXISTS(SELECT 1 FROM community_posts p WHERE p.checkin_id = c.id) AS shared
    FROM checkins c WHERE c.user_id = ?1 AND c.product_code = 'eye-focus' AND c.local_date = ?2 LIMIT 1`,
  )
    .bind(user.id, date)
    .first<CheckinRow>();
  if (existingToday) {
    return json({ checkin: { ...existingToday, shared: Boolean(existingToday.shared) }, summary: await getSummary(env, user) });
  }

  const trainingId = crypto.randomUUID();
  const checkinId = crypto.randomUUID();
  const now = sqlTimestamp(new Date());
  try {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO training_sessions
          (id, user_id, product_code, started_at, completed_at, duration_sec, left_completed, right_completed, client_session_id)
        VALUES (?1, ?2, 'eye-focus', ?3, ?3, ?4, 1, 1, ?5)`,
      ).bind(trainingId, user.id, now, durationSec, clientSessionId),
      env.DB.prepare(
        `INSERT INTO checkins
          (id, user_id, product_code, local_date, training_session_id, duration_sec)
        VALUES (?1, ?2, 'eye-focus', ?3, ?4, ?5)`,
      ).bind(checkinId, user.id, date, trainingId, durationSec),
    ]);
  } catch (cause) {
    console.error(JSON.stringify({ message: "training save failed", error: cause instanceof Error ? cause.message : String(cause) }));
    return error("训练记录没有保存成功。", 500);
  }

  const summary = await getSummary(env, user);
  return json({
    checkin: {
      id: checkinId,
      localDate: date,
      productCode: "eye-focus",
      durationSec,
      createdAt: now,
      shared: false,
    },
    summary,
  }, 201);
}

async function handleCheckins(env: Env, user: SessionUserRow): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT c.id, c.local_date AS localDate, c.product_code AS productCode,
      c.duration_sec AS durationSec, c.created_at AS createdAt,
      EXISTS(SELECT 1 FROM community_posts p WHERE p.checkin_id = c.id) AS shared
    FROM checkins c WHERE c.user_id = ?1 ORDER BY c.local_date DESC LIMIT 366`,
  )
    .bind(user.id)
    .all<CheckinRow>();
  return json({ checkins: rows.results.map((row) => ({ ...row, shared: Boolean(row.shared) })) });
}

async function handleFeed(request: Request, env: Env, user: SessionUserRow | null): Promise<Response> {
  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") ?? "recommended";
  const requestedLimit = Number(url.searchParams.get("limit") ?? "12");
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 12;
  const cursor = url.searchParams.get("cursor");
  if (!["recommended", "latest", "following"].includes(tab)) return error("动态分类无效。", 400);
  if (tab === "following" && !user) return json({ posts: [], nextCursor: null });

  const conditions = ["p.visibility = 'public'", "p.moderation_status = 'approved'"];
  const params: Array<string | number> = [];
  if (tab === "following" && user) {
    conditions.push("EXISTS(SELECT 1 FROM community_follows f WHERE f.follower_id = ? AND f.followed_id = p.user_id)");
    params.push(user.id);
  }
  if (cursor) {
    conditions.push("p.created_at < ?");
    params.push(cursor);
  }
  if (user) {
    conditions.push("NOT EXISTS(SELECT 1 FROM community_blocks b WHERE (b.blocker_id = ? AND b.blocked_id = p.user_id) OR (b.blocker_id = p.user_id AND b.blocked_id = ?))");
    params.push(user.id, user.id);
  }
  params.push(user?.id ?? "", limit);

  const statement = env.DB.prepare(
    `SELECT
      p.id,
      p.user_id AS userId,
      cp.nickname,
      cp.avatar_code AS avatarCode,
      cp.avatar_image_key AS avatarImageKey,
      p.product_code AS productCode,
      p.local_date AS localDate,
      p.duration_bucket AS durationBucket,
      p.public_streak AS publicStreak,
      p.public_week_count AS publicWeekCount,
      p.public_total_count AS publicTotalCount,
      p.note,
      p.image_key AS imageKey,
      (SELECT COUNT(*) FROM community_reactions r WHERE r.post_id = p.id) AS encouragementCount,
      (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.moderation_status = 'approved') AS commentCount,
      EXISTS(SELECT 1 FROM community_reactions my WHERE my.post_id = p.id AND my.user_id = ?) AS encouragedByMe,
      p.created_at AS createdAt
    FROM community_posts p
    JOIN community_profiles cp ON cp.user_id = p.user_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ?`,
  ).bind(...params);
  const rows = await statement.all<CommunityPostRow>();
  const posts = rows.results.map((row) => ({
    ...row,
    avatarUrl: assetUrl(row.avatarImageKey),
    imageUrl: assetUrl(row.imageKey),
    encouragedByMe: Boolean(row.encouragedByMe),
  }));
  return json({ posts, nextCursor: posts.at(-1)?.createdAt ?? null });
}

async function handlePublish(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const checkinId = readString(body, "checkinId");
  const note = readString(body, "note");
  const imageAssetId = readString(body, "imageAssetId");
  if (note.length > 80) return error("感受最多填写 80 个字符。", 400);
  const checkin = await env.DB.prepare(
    "SELECT id, local_date AS localDate, duration_sec AS durationSec FROM checkins WHERE id = ?1 AND user_id = ?2 LIMIT 1",
  )
    .bind(checkinId, user.id)
    .first<{ id: string; localDate: string; durationSec: number }>();
  if (!checkin) return error("没有找到可发布的打卡。", 404);
  const existing = await env.DB.prepare("SELECT id FROM community_posts WHERE user_id = ?1 AND checkin_id = ?2 LIMIT 1")
    .bind(user.id, checkinId)
    .first<{ id: string }>();
  if (existing) return error("这条打卡已经发布。", 409);

  const summary = await getSummary(env, user);
  const id = crypto.randomUUID();
  const showStreak = body.showStreak !== false;
  const showWeekCount = body.showWeekCount !== false;
  const showTotalCount = body.showTotalCount !== false;
  let imageKey: string | null = null;
  if (imageAssetId) {
    const asset = await env.DB.prepare(
      "SELECT object_key AS objectKey FROM asset_uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'community' AND status = 'active' LIMIT 1",
    ).bind(imageAssetId, user.id).first<{ objectKey: string }>();
    if (!asset) return error("没有找到可发布的图片。", 400);
    imageKey = asset.objectKey;
  }
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO community_posts
        (id, user_id, checkin_id, product_code, local_date, duration_bucket,
         public_streak, public_week_count, public_total_count, note, image_asset_id, image_key)
      VALUES (?1, ?2, ?3, 'eye-focus', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    ).bind(
      id,
      user.id,
      checkinId,
      checkin.localDate,
      checkin.durationSec < 150 ? "约 2 分钟" : "约 3 分钟",
      showStreak ? summary.streak : null,
      showWeekCount ? summary.weekCount : null,
      showTotalCount ? summary.totalCount : null,
      note || null,
      imageAssetId || null,
      imageKey,
    ),
    env.DB.prepare("UPDATE community_profiles SET visibility = 'public', updated_at = CURRENT_TIMESTAMP WHERE user_id = ?1").bind(user.id),
  ]);
  return json({ id }, 201);
}

async function handleEncouragement(postId: string, env: Env, user: SessionUserRow): Promise<Response> {
  const post = await env.DB.prepare(
    "SELECT id FROM community_posts WHERE id = ?1 AND visibility = 'public' AND moderation_status = 'approved' LIMIT 1",
  ).bind(postId).first();
  if (!post) return error("没有找到这条动态。", 404);
  const existing = await env.DB.prepare(
    "SELECT post_id FROM community_reactions WHERE post_id = ?1 AND user_id = ?2 LIMIT 1",
  ).bind(postId, user.id).first();
  if (existing) {
    await env.DB.prepare("DELETE FROM community_reactions WHERE post_id = ?1 AND user_id = ?2").bind(postId, user.id).run();
  } else {
    await env.DB.prepare("INSERT INTO community_reactions (post_id, user_id) VALUES (?1, ?2)").bind(postId, user.id).run();
  }
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM community_reactions WHERE post_id = ?1")
    .bind(postId)
    .first<{ total: number }>();
  return json({ encouraged: !existing, count: Number(count?.total ?? 0) });
}

async function handleComments(postId: string, request: Request, env: Env, user: SessionUserRow | null): Promise<Response> {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "30");
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 30;
  const post = await env.DB.prepare(
    "SELECT id FROM community_posts WHERE id = ?1 AND visibility = 'public' AND moderation_status = 'approved' LIMIT 1",
  ).bind(postId).first();
  if (!post) return error("没有找到这条动态。", 404);

  const rows = await env.DB.prepare(
    `SELECT
      c.id,
      c.post_id AS postId,
      c.user_id AS userId,
      cp.nickname,
      cp.avatar_code AS avatarCode,
      cp.avatar_image_key AS avatarImageKey,
      c.content,
      CASE WHEN c.user_id = ?1 THEN 1 ELSE 0 END AS canDelete,
      c.created_at AS createdAt
    FROM community_comments c
    JOIN community_profiles cp ON cp.user_id = c.user_id
    WHERE c.post_id = ?2 AND c.moderation_status = 'approved'
    ORDER BY c.created_at ASC, c.id ASC
    LIMIT ?3`,
  ).bind(user?.id ?? "", postId, limit).all<CommunityCommentRow>();
  return json({
    comments: rows.results.map((row) => ({
      ...row,
      avatarUrl: assetUrl(row.avatarImageKey),
      canDelete: Boolean(row.canDelete),
    })),
  });
}

async function handleCreateComment(postId: string, request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const content = normalizeCommentContent(readString(body, "content"));
  if (content.length < 1) return error("评论内容不能为空。", 400);
  if (content.length > 240) return error("评论最多填写 240 个字符。", 400);

  const post = await env.DB.prepare(
    "SELECT id FROM community_posts WHERE id = ?1 AND visibility = 'public' AND moderation_status = 'approved' LIMIT 1",
  ).bind(postId).first();
  if (!post) return error("没有找到这条动态。", 404);

  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO community_comments (id, post_id, user_id, content) VALUES (?1, ?2, ?3, ?4)",
  ).bind(id, postId, user.id, content).run();

  const comment = await env.DB.prepare(
    `SELECT
      c.id,
      c.post_id AS postId,
      c.user_id AS userId,
      cp.nickname,
      cp.avatar_code AS avatarCode,
      cp.avatar_image_key AS avatarImageKey,
      c.content,
      1 AS canDelete,
      c.created_at AS createdAt
    FROM community_comments c
    JOIN community_profiles cp ON cp.user_id = c.user_id
    WHERE c.id = ?1
    LIMIT 1`,
  ).bind(id).first<CommunityCommentRow>();
  return json({
    comment: comment ? {
      ...comment,
      avatarUrl: assetUrl(comment.avatarImageKey),
      canDelete: true,
    } : null,
  }, 201);
}

async function handleDeleteComment(commentId: string, env: Env, user: SessionUserRow): Promise<Response> {
  const existing = await env.DB.prepare(
    "SELECT id FROM community_comments WHERE id = ?1 AND user_id = ?2 AND moderation_status = 'approved' LIMIT 1",
  ).bind(commentId, user.id).first<{ id: string }>();
  if (!existing) return error("没有找到可删除的评论。", 404);

  await env.DB.prepare(
    "UPDATE community_comments SET moderation_status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?1 AND user_id = ?2",
  ).bind(commentId, user.id).run();
  return new Response(null, { status: 204, headers: apiHeaders });
}

function validMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method !== "GET" && method !== "HEAD" && !validMutationOrigin(request)) {
    return error("请求来源无效。", 403);
  }

  if (method === "GET" && path === "/api/health") return json({ status: "ok" });
  const assetMatch = path.match(/^\/api\/assets\/(.+)$/);
  if (method === "GET" && assetMatch?.[1]) return handleAsset(request, env, assetMatch[1]);
  if (method === "GET" && path === "/api/tts/training") return handleTrainingSpeech(request, env);
  if (method === "POST" && path === "/api/auth/register") return handleRegister(request, env);
  if (method === "POST" && path === "/api/auth/login") return handleLogin(request, env);
  if (method === "POST" && path === "/api/auth/logout") return handleLogout(request, env);

  const user = await currentUser(request, env);
  if (method === "GET" && path === "/api/me") return json({ user: user ? publicUser(user) : null });
  if (method === "GET" && path === "/api/home") return json(await getSummary(env, user));
  if (method === "GET" && path === "/api/community/feed") return handleFeed(request, env, user);

  const commentsMatch = path.match(/^\/api\/community\/posts\/([a-zA-Z0-9-]+)\/comments$/);
  if (method === "GET" && commentsMatch?.[1]) {
    return handleComments(commentsMatch[1], request, env, user);
  }

  if (!user) return error("请先登录。", 401);
  if (method === "POST" && path === "/api/assets/upload") return handleUploadAsset(request, env, user);
  if (method === "GET" && path === "/api/nutrition/images") return handleNutritionImages(env, user);
  if (method === "GET" && path === "/api/memory/summary") return json(await getMemorySummary(env, user));
  if (method === "GET" && path === "/api/memory/decks") return handleMemoryDecks(env, user);
  if (method === "POST" && path === "/api/memory/decks") return handleCreateMemoryDeck(request, env, user);
  if (method === "GET" && path === "/api/memory/items") return handleMemoryItems(request, env, user);
  if (method === "GET" && path === "/api/memory/items/due") return handleDueMemoryItems(request, env, user);
  if (method === "POST" && path === "/api/memory/items") return handleCreateMemoryItem(request, env, user);
  if (method === "POST" && path === "/api/memory/reviews") return handleMemoryReview(request, env, user);
  if (method === "POST" && path === "/api/memory/sessions/complete") return handleMemorySessionComplete(request, env, user);
  if (method === "POST" && path === "/api/memory/ai/card-drafts") return handleGenerateMemoryCardDrafts(request, env, user);
  if (method === "GET" && path === "/api/memory/palaces") return handleMemoryPalaces(env, user);
  if (method === "POST" && path === "/api/memory/palaces") return handleCreateMemoryPalace(request, env, user);

  const memoryItemMatch = path.match(/^\/api\/memory\/items\/([a-zA-Z0-9-]+)$/);
  if (method === "DELETE" && memoryItemMatch?.[1]) {
    return handleDeleteMemoryItem(memoryItemMatch[1], env, user);
  }

  const memoryLociMatch = path.match(/^\/api\/memory\/palaces\/([a-zA-Z0-9-]+)\/loci$/);
  if (method === "POST" && memoryLociMatch?.[1]) {
    return handleCreateMemoryLocus(memoryLociMatch[1], request, env, user);
  }

  const memoryPalaceViewMatch = path.match(/^\/api\/memory\/palaces\/([a-zA-Z0-9-]+)\/generate-view$/);
  if (method === "POST" && memoryPalaceViewMatch?.[1]) {
    return handleGenerateMemoryPalaceView(memoryPalaceViewMatch[1], request, env, user);
  }

  if (method === "POST" && path === "/api/training/complete") return handleTrainingComplete(request, env, user);
  if (method === "GET" && path === "/api/checkins") return handleCheckins(env, user);
  if (method === "POST" && path === "/api/community/posts") return handlePublish(request, env, user);

  if (method === "POST" && commentsMatch?.[1]) {
    return handleCreateComment(commentsMatch[1], request, env, user);
  }

  const deleteCommentMatch = path.match(/^\/api\/community\/comments\/([a-zA-Z0-9-]+)$/);
  if (method === "DELETE" && deleteCommentMatch?.[1]) {
    return handleDeleteComment(deleteCommentMatch[1], env, user);
  }

  const encouragementMatch = path.match(/^\/api\/community\/posts\/([a-zA-Z0-9-]+)\/encouragement$/);
  if (method === "POST" && encouragementMatch?.[1]) {
    return handleEncouragement(encouragementMatch[1], env, user);
  }

  return error("没有找到这个接口。", 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });
    console.log(JSON.stringify({ message: "api request", method: request.method, path: url.pathname }));
    try {
      return await route(request, env);
    } catch (cause) {
      console.error(JSON.stringify({
        message: "unhandled api error",
        path: url.pathname,
        error: cause instanceof Error ? cause.message : String(cause),
      }));
      return error("服务暂时不可用，请稍后再试。", 500);
    }
  },
} satisfies ExportedHandler<Env>;
