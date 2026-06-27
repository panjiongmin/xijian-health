import { timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 10_000;
const MIN_PASSWORD_ITERATIONS = 5_000;
const SESSION_DAYS = 30;

type JsonObject = Record<string, unknown>;

type SessionUserRow = {
  id: string;
  email: string;
  displayName: string;
  avatarCode: string;
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
  productCode: string;
  localDate: string;
  durationBucket: string;
  publicStreak: number | null;
  publicWeekCount: number | null;
  publicTotalCount: number | null;
  note: string | null;
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
  content: string;
  canDelete: number;
  createdAt: string;
};

type Summary = {
  completedToday: boolean;
  weekCount: number;
  streak: number;
  totalCount: number;
  recentDates: string[];
};

const apiHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
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

function bytesToHex(value: ArrayBuffer | ArrayBufferView): string {
  const bytes = value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
      p.product_code AS productCode,
      p.local_date AS localDate,
      p.duration_bucket AS durationBucket,
      p.public_streak AS publicStreak,
      p.public_week_count AS publicWeekCount,
      p.public_total_count AS publicTotalCount,
      p.note,
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
  const posts = rows.results.map((row) => ({ ...row, encouragedByMe: Boolean(row.encouragedByMe) }));
  return json({ posts, nextCursor: posts.at(-1)?.createdAt ?? null });
}

async function handlePublish(request: Request, env: Env, user: SessionUserRow): Promise<Response> {
  const body = await readBody(request);
  if (!body) return error("请求内容无效。", 400);
  const checkinId = readString(body, "checkinId");
  const note = readString(body, "note");
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
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO community_posts
        (id, user_id, checkin_id, product_code, local_date, duration_bucket,
         public_streak, public_week_count, public_total_count, note)
      VALUES (?1, ?2, ?3, 'eye-focus', ?4, ?5, ?6, ?7, ?8, ?9)`,
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
    comments: rows.results.map((row) => ({ ...row, canDelete: Boolean(row.canDelete) })),
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
      c.content,
      1 AS canDelete,
      c.created_at AS createdAt
    FROM community_comments c
    JOIN community_profiles cp ON cp.user_id = c.user_id
    WHERE c.id = ?1
    LIMIT 1`,
  ).bind(id).first<CommunityCommentRow>();
  return json({ comment: comment ? { ...comment, canDelete: true } : null }, 201);
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
