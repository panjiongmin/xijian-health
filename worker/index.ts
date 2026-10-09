import { timingSafeEqual } from "node:crypto";
export type AppEnv = Env & {
    PUSHPLUS_TOKEN?: string;
    PUSHPLUS_SECRET_KEY?: string;
    PUSHPLUS_CALLBACK_SECRET?: string;
};
type JsonObject = Record<string, unknown>;
type SessionUserRow = {
    id: string;
    email: string;
    displayName: string;
    avatarCode: string;
    avatarImageKey: string | null;
    createdAt: string;
    timezone: string;
    role: "admin" | "member";
};
const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 10000;
const MIN_PASSWORD_ITERATIONS = 5000;
const SESSION_DAYS = 30;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const apiHeaders = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff" };
function json(data: unknown, status = 200, headers?: HeadersInit) { return Response.json(data, { status, headers: { ...apiHeaders, ...headers } }); }
function error(message: string, status: number) { return json({ error: message }, status); }
function asObject(value: unknown): JsonObject | null { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null; }
async function readBody(request: Pick<Request, "headers" | "body">): Promise<JsonObject | null> {
    try {
        const bytes = await readLimited(request, 16384);
        return bytes ? asObject(JSON.parse(new TextDecoder().decode(bytes))) : null;
    }
    catch {
        return null;
    }
}
async function readLimited(request: Pick<Request, "headers" | "body">, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
    if (Number(request.headers.get("content-length")) > limit || !request.body)
        return null;
    const reader = request.body.getReader();
    const parts: Uint8Array[] = [];
    let length = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            length += value.byteLength;
            if (length > limit) {
                await reader.cancel();
                return null;
            }
            parts.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return bytes;
}
function readString(body: JsonObject, key: string): string { return typeof body[key] === "string" ? body[key].trim() : ""; }
function avatarFromId(id: string) { return ["moss", "pond", "fern"][(id.codePointAt(0) || 0) % 3]; }
function assetUrl(key: string | null | undefined) { return key ? `/api/assets/${key.split("/").map(encodeURIComponent).join("/")}` : null; }
function bytesToHex(value: ArrayBuffer | ArrayBufferView): string {
    const bytes = value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(value: string): Uint8Array<ArrayBuffer> {
    if (value.length % 2 !== 0)
        return new Uint8Array(new ArrayBuffer(0));
    const result = new Uint8Array(new ArrayBuffer(value.length / 2));
    for (let index = 0; index < value.length; index += 2) {
        const byte = Number.parseInt(value.slice(index, index + 2), 16);
        if (Number.isNaN(byte))
            return new Uint8Array(new ArrayBuffer(0));
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
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations: PASSWORD_ITERATIONS, salt }, key, 256);
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
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const actual = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", iterations, salt }, key, 256);
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
        if (key === name)
            return decodeURIComponent(rest.join("="));
    }
    return null;
}
function sessionCookie(token: string, request: Request): string {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return `xijian_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
function clearSessionCookie(request: Request): string {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return `xijian_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
async function createSession(env: AppEnv, userId: string): Promise<string> {
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?1, ?2, ?3, ?4)")
        .bind(crypto.randomUUID(), userId, tokenHash, sqlTimestamp(expiresAt))
        .run();
    return token;
}
async function currentUser(request: Request, env: AppEnv): Promise<SessionUserRow | null> {
    const token = getCookie(request, "xijian_session");
    if (!token)
        return null;
    const tokenHash = await sha256Hex(token);
    return env.DB.prepare(`SELECT
      u.id,
      u.email,
      u.display_name AS displayName,
      COALESCE(cp.avatar_code, 'moss') AS avatarCode,
      cp.avatar_image_key AS avatarImageKey,
      u.created_at AS createdAt,
      u.timezone,
      CASE WHEN lower(u.email) = lower(?2) THEN 'admin' ELSE 'member' END AS role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN community_profiles cp ON cp.user_id = u.id
    WHERE s.token_hash = ?1
      AND s.expires_at > datetime('now')
      AND u.status = 'active'
    LIMIT 1`)
        .bind(tokenHash, env.ADMIN_EMAIL || "")
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
        role: user.role,
    };
}
async function handleRegister(request: Request, env: AppEnv): Promise<Response> {
    const body = await readBody(request);
    if (!body)
        return error("请求内容无效。", 400);
    const email = readString(body, "email").toLowerCase();
    const password = readString(body, "password");
    const displayName = readString(body, "displayName");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return error("请输入有效邮箱。", 400);
    if (password.length < 8 || password.length > 72)
        return error("密码长度需要在 8 到 72 位之间。", 400);
    if (displayName.length < 2 || displayName.length > 20)
        return error("昵称长度需要在 2 到 20 个字符之间。", 400);
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?1 LIMIT 1").bind(email).first();
    if (existing)
        return error("这个邮箱已经注册，请直接登录。", 409);
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const avatarCode = avatarFromId(id);
    try {
        await env.DB.batch([
            env.DB.prepare("INSERT INTO users (id, email, password_hash, display_name) VALUES (?1, ?2, ?3, ?4)").bind(id, email, passwordHash, displayName),
            env.DB.prepare("INSERT INTO community_profiles (user_id, nickname, avatar_code, visibility) VALUES (?1, ?2, ?3, 'private')").bind(id, displayName, avatarCode),
        ]);
        const token = await createSession(env, id);
        return json({ ok: true }, 201, { "Set-Cookie": sessionCookie(token, request) });
    }
    catch (cause) {
        console.error(JSON.stringify({ message: "registration failed", error: cause instanceof Error ? cause.message : String(cause) }));
        return error("注册没有成功，请稍后再试。", 500);
    }
}
async function handleLogin(request: Request, env: AppEnv): Promise<Response> {
    const body = await readBody(request);
    if (!body)
        return error("请求内容无效。", 400);
    const email = readString(body, "email").toLowerCase();
    const password = readString(body, "password");
    const user = await env.DB.prepare("SELECT id, password_hash AS passwordHash FROM users WHERE email = ?1 AND status = 'active' LIMIT 1")
        .bind(email)
        .first<{
        id: string;
        passwordHash: string | null;
    }>();
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        return error("邮箱或密码不正确。", 401);
    }
    const token = await createSession(env, user.id);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, request) });
}
async function handleLogout(request: Request, env: AppEnv): Promise<Response> {
    const token = getCookie(request, "xijian_session");
    if (token) {
        const tokenHash = await sha256Hex(token);
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
    }
    return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie(request) });
}
type TaskDay = {
    id: string;
    title: string;
    description: string;
    imagePolicy: "none" | "optional" | "required";
    checkinId: string | null;
    completedAt: string | null;
};
type ImageRow = {
    id: string;
    objectKey: string;
    checkinId: string;
};
type ReminderSettings = {
    enabled: number;
    reminderTime: string;
    siteUrl: string;
};
export function beijingDate(now = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function beijingTime(now = new Date()): string {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}
export function weekdayBit(date: string): number { return 1 << new Date(`${date}T00:00:00Z`).getUTCDay(); }
function validDate(date: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date; }
async function snapshotDay(env: AppEnv, date: string) {
    await env.DB.prepare(`INSERT OR IGNORE INTO task_days(task_id, local_date, title, description, image_policy, due)
    SELECT id, ?1, title, description, image_policy, CASE WHEN active = 1 AND (weekday_mask & ?2) != 0 THEN 1 ELSE 0 END
    FROM tasks WHERE start_date <= ?1`).bind(date, weekdayBit(date)).run();
}
async function dayTasks(env: AppEnv, userId: string, date: string): Promise<TaskDay[]> {
    const rows = await env.DB.prepare(`SELECT d.task_id AS id, d.title, d.description, d.image_policy AS imagePolicy,
    c.id AS checkinId, c.created_at AS completedAt FROM task_days d
    LEFT JOIN task_checkins c ON c.task_id = d.task_id AND c.local_date = d.local_date AND c.user_id = ?1
    JOIN tasks t ON t.id = d.task_id WHERE d.local_date = ?2 AND d.due = 1 ORDER BY t.created_at, t.id`).bind(userId, date).all<TaskDay>();
    return rows.results;
}
async function imagesFor(env: AppEnv, userId: string, date: string, admin = false) {
    const rows = await env.DB.prepare(`SELECT u.id, u.object_key AS objectKey, i.checkin_id AS checkinId
    FROM task_checkin_images i JOIN task_uploads u ON u.id = i.upload_id
    JOIN task_checkins c ON c.id = i.checkin_id WHERE c.local_date = ?1 AND (?3 = 1 OR c.user_id = ?2)
    ORDER BY i.position`).bind(date, userId, admin ? 1 : 0).all<ImageRow>();
    return rows.results;
}
function withImages(tasks: TaskDay[], images: ImageRow[]) {
    return tasks.map(task => ({ ...task, images: images.filter(image => image.checkinId === task.checkinId).map(image => ({ id: image.id, url: assetUrl(image.objectKey) })) }));
}
async function today(env: AppEnv, user: SessionUserRow) {
    const date = beijingDate();
    await snapshotDay(env, date);
    const [tasks, images, settings] = await Promise.all([dayTasks(env, user.id, date), imagesFor(env, user.id, date), reminderSettings(env)]);
    return json({ date, tasks: withImages(tasks, images), reminderTime: settings.enabled ? settings.reminderTime : null });
}
async function saveTask(request: Request, env: AppEnv, user: SessionUserRow, id?: string) {
    const body = await readBody(request);
    if (!body)
        return error("任务内容无效。", 400);
    const title = readString(body, "title");
    const description = readString(body, "description");
    const days = body.weekdays;
    const imagePolicy = readString(body, "imagePolicy");
    if (!title || title.length > 60 || description.length > 300)
        return error("任务名称为 1–60 字，说明最多 300 字。", 400);
    if (!Array.isArray(days) || !days.length || days.length > 7 || days.some(day => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6))
        return error("请至少选择一个重复日期。", 400);
    if (!["none", "optional", "required"].includes(imagePolicy) || typeof body.active !== "boolean")
        return error("任务设置无效。", 400);
    const mask = days.reduce((sum: number, day: number) => sum | (1 << day), 0);
    const date = beijingDate();
    await snapshotDay(env, date);
    if (id) {
        const result = await env.DB.prepare("UPDATE tasks SET title=?1, description=?2, weekday_mask=?3, image_policy=?4, active=?5, updated_at=CURRENT_TIMESTAMP WHERE id=?6")
            .bind(title, description, mask, imagePolicy, body.active ? 1 : 0, id).run();
        if (!result.meta.changes)
            return error("任务不存在。", 404);
    }
    else {
        await env.DB.prepare("INSERT INTO tasks(id,title,description,weekday_mask,image_policy,active,start_date,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)")
            .bind(crypto.randomUUID(), title, description, mask, imagePolicy, body.active ? 1 : 0, date, user.id).run();
        await snapshotDay(env, date);
    }
    return json({ ok: true, effective: id ? "tomorrow" : "today" }, id ? 200 : 201);
}
async function checkin(request: Request, env: AppEnv, user: SessionUserRow, taskId: string) {
    const date = beijingDate();
    await snapshotDay(env, date);
    const task = await env.DB.prepare("SELECT image_policy AS imagePolicy FROM task_days WHERE task_id=?1 AND local_date=?2 AND due=1").bind(taskId, date).first<{
        imagePolicy: string;
    }>();
    if (!task)
        return error("这个任务不在今日计划中。", 404);
    const body = await readBody(request);
    const ids = body?.imageIds;
    if (body?.date !== date)
        return error("日期已变化，请刷新今日任务后再打卡。", 409);
    if (!Array.isArray(ids) || ids.length > 3 || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length)
        return error("每次打卡最多上传 3 张图片。", 400);
    if (task.imagePolicy === "required" && !ids.length)
        return error("这个任务需要上传图片后打卡。", 400);
    if (task.imagePolicy === "none" && ids.length)
        return error("这个任务无需上传图片。", 400);
    for (const id of ids) {
        const owned = await env.DB.prepare("SELECT id FROM task_uploads WHERE id=?1 AND user_id=?2").bind(id, user.id).first();
        if (!owned)
            return error("图片无效或不属于当前账号。", 400);
    }
    const existing = await env.DB.prepare("SELECT id FROM task_checkins WHERE user_id=?1 AND task_id=?2 AND local_date=?3").bind(user.id, taskId, date).first();
    if (existing)
        return error("今天已经完成这项任务。", 409);
    const id = crypto.randomUUID();
    // INSERT OR IGNORE plus SELECT guards make concurrent duplicate submissions harmless.
    await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO task_checkins(id,user_id,task_id,local_date) VALUES(?1,?2,?3,?4)").bind(id, user.id, taskId, date),
        ...ids.map((uploadId, position) => env.DB.prepare("INSERT INTO task_checkin_images(checkin_id,upload_id,position) SELECT ?1,?2,?3 WHERE EXISTS(SELECT 1 FROM task_checkins WHERE id=?1)").bind(id, uploadId, position)),
    ]);
    return json({ ok: true }, 201);
}
async function undo(request: Request, env: AppEnv, user: SessionUserRow, taskId: string) {
    const body = await readBody(request);
    if (body?.date !== beijingDate())
        return error("只能撤销今天的打卡，请刷新页面。", 409);
    await env.DB.prepare("DELETE FROM task_checkins WHERE user_id=?1 AND task_id=?2 AND local_date=?3").bind(user.id, taskId, beijingDate()).run();
    return json({ ok: true });
}
export function imageMime(bytes: Uint8Array): string | null {
    if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
        return "image/jpeg";
    if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value))
        return "image/png";
    if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP")
        return "image/webp";
    return null;
}
async function upload(request: Request, env: AppEnv, user: SessionUserRow) {
    if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES + 16384)
        return error("每张图片不能超过 4MB。", 413);
    const requestBytes = await readLimited(request, MAX_IMAGE_BYTES + 16384);
    if (!requestBytes)
        return error("图片上传内容过大或无效。", 413);
    const form = await new Response(requestBytes, { headers: request.headers }).formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || !file.size)
        return error("请选择图片。", 400);
    if (file.size > MAX_IMAGE_BYTES)
        return error("每张图片不能超过 4MB。", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = imageMime(bytes);
    if (!mime || mime !== file.type)
        return error("仅支持有效的 JPG、PNG 或 WebP 图片。", 400);
    const id = crypto.randomUUID();
    const key = `checkins/${user.id}/${id}.${mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp"}`;
    await env.ASSETS_BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
    try {
        await env.DB.prepare("INSERT INTO task_uploads(id,user_id,object_key,content_type,byte_size,original_name) VALUES(?1,?2,?3,?4,?5,?6)").bind(id, user.id, key, mime, file.size, file.name.slice(0, 120)).run();
    }
    catch (cause) {
        await env.ASSETS_BUCKET.delete(key);
        throw cause;
    }
    return json({ asset: { id, url: assetUrl(key) } }, 201);
}
async function asset(request: Request, env: AppEnv, user: SessionUserRow, rawKey: string) {
    let key: string;
    try {
        key = decodeURIComponent(rawKey);
    }
    catch {
        return error("图片地址无效。", 400);
    }
    const row = await env.DB.prepare("SELECT user_id AS userId FROM task_uploads WHERE object_key=?1").bind(key).first<{
        userId: string;
    }>();
    if (!row || (row.userId !== user.id && user.role !== "admin"))
        return error("没有找到这张图片。", 404);
    const object = await env.ASSETS_BUCKET.get(key);
    if (!object)
        return error("没有找到这张图片。", 404);
    const headers = { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "ETag": object.httpEtag };
    if (request.headers.get("If-None-Match") === object.httpEtag)
        return new Response(null, { status: 304, headers });
    return new Response(object.body, { headers });
}
async function records(request: Request, env: AppEnv, user: SessionUserRow) {
    const month = new URL(request.url).searchParams.get("month") || beijingDate().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
        return error("月份无效。", 400);
    await snapshotDay(env, beijingDate());
    const [days, count] = await Promise.all([
        env.DB.prepare(`SELECT d.local_date AS date, SUM(d.due) AS planned, COUNT(c.id) AS completed
      FROM task_days d LEFT JOIN task_checkins c ON c.task_id=d.task_id AND c.local_date=d.local_date AND c.user_id=?1
      WHERE d.local_date LIKE ?2 AND d.local_date >= date(?3, '+8 hours') GROUP BY d.local_date ORDER BY d.local_date`).bind(user.id, `${month}-%`, user.createdAt).all(),
        env.DB.prepare("SELECT COUNT(DISTINCT local_date) AS totalDays FROM task_checkins WHERE user_id=?1").bind(user.id).first(),
    ]);
    return json({ month, days: days.results, ...count });
}
async function recordDetail(request: Request, env: AppEnv, user: SessionUserRow) {
    const date = new URL(request.url).searchParams.get("date") || beijingDate();
    if (!validDate(date) || date > beijingDate())
        return error("日期无效。", 400);
    if (date < beijingDate(new Date(`${user.createdAt.replace(" ", "T")}Z`)))
        return json({ date, tasks: [] });
    const [tasks, images] = await Promise.all([dayTasks(env, user.id, date), imagesFor(env, user.id, date)]);
    return json({ date, tasks: withImages(tasks, images) });
}
async function adminOverview(request: Request, env: AppEnv) {
    const date = new URL(request.url).searchParams.get("date") || beijingDate();
    if (!validDate(date) || date > beijingDate())
        return error("日期无效。", 400);
    if (date === beijingDate())
        await snapshotDay(env, date);
    const [users, plans, checkins, images, deliveries] = await Promise.all([
        env.DB.prepare("SELECT id,display_name AS displayName,email FROM users WHERE status='active' AND password_hash IS NOT NULL AND date(created_at,'+8 hours') <= ?1 ORDER BY created_at").bind(date).all<{
            id: string;
            displayName: string;
            email: string;
        }>(),
        dayTasks(env, "", date),
        env.DB.prepare("SELECT id,user_id AS userId,task_id AS taskId,created_at AS completedAt FROM task_checkins WHERE local_date=?1").bind(date).all<{
            id: string;
            userId: string;
            taskId: string;
            completedAt: string;
        }>(),
        imagesFor(env, "", date, true),
        env.DB.prepare("SELECT user_id AS userId,status,error_code AS errorCode FROM reminder_deliveries WHERE local_date=?1").bind(date).all<{
            userId: string;
            status: string;
            errorCode: string | null;
        }>(),
    ]);
    return json({ date, tasks: plans, members: users.results.map(user => ({ ...user, reminder: deliveries.results.find(item => item.userId === user.id) || null,
            tasks: plans.map(task => {
                const row = checkins.results.find(item => item.userId === user.id && item.taskId === task.id);
                return { ...task, checkinId: row?.id || null, completedAt: row?.completedAt || null, images: images.filter(image => image.checkinId === row?.id).map(image => ({ id: image.id, url: assetUrl(image.objectKey) })) };
            }) })) });
}
async function reminderSettings(env: AppEnv): Promise<ReminderSettings> {
    return (await env.DB.prepare("SELECT enabled,reminder_time AS reminderTime,site_url AS siteUrl FROM reminder_settings WHERE id=1").first<ReminderSettings>())!;
}
function ready(env: AppEnv) { return Boolean(env.PUSHPLUS_TOKEN && env.PUSHPLUS_SECRET_KEY && env.PUSHPLUS_CALLBACK_SECRET); }
function callbackUrl(env: AppEnv, siteUrl: string) { return `${siteUrl}/api/pushplus/callback/${env.PUSHPLUS_CALLBACK_SECRET}`; }
async function preferences(env: AppEnv, user: SessionUserRow) {
    const [settings, pref] = await Promise.all([reminderSettings(env), env.DB.prepare("SELECT enabled,friend_token AS friendToken FROM notification_preferences WHERE user_id=?1").bind(user.id).first<{
            enabled: number;
            friendToken: string | null;
        }>()]);
    return json({ enabled: Boolean(pref?.enabled), bound: Boolean(pref?.friendToken), available: ready(env) && Boolean(settings.siteUrl), remindersEnabled: Boolean(settings.enabled), reminderTime: settings.reminderTime });
}
async function setPreference(request: Request, env: AppEnv, user: SessionUserRow) {
    const body = await readBody(request);
    if (typeof body?.enabled !== "boolean")
        return error("提醒设置无效。", 400);
    if (body.enabled) {
        const pref = await env.DB.prepare("SELECT friend_token FROM notification_preferences WHERE user_id=?1 AND friend_token IS NOT NULL").bind(user.id).first();
        if (!pref)
            return error("请先扫码绑定微信通知。", 400);
    }
    await env.DB.prepare("INSERT INTO notification_preferences(user_id,enabled) VALUES(?1,?2) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP").bind(user.id, body.enabled ? 1 : 0).run();
    return preferences(env, user);
}
async function unbind(env: AppEnv, user: SessionUserRow) {
    await env.DB.prepare("UPDATE notification_preferences SET enabled=0,friend_token=NULL,binding_code=NULL,binding_expires_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE user_id=?1").bind(user.id).run();
    return preferences(env, user);
}
async function pushplusJson(url: string, init: RequestInit): Promise<JsonObject> {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const body = asObject(await response.json());
    if (!response.ok || !body || body.code !== 200)
        throw new Error(`pushplus_${body?.code || response.status}`);
    return body;
}
async function accessKey(env: AppEnv): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const cached = await env.DB.prepare("SELECT access_key AS accessKey FROM pushplus_access_cache WHERE id=1 AND expires_at > ?1").bind(now + 300).first<{
        accessKey: string;
    }>();
    if (cached)
        return cached.accessKey;
    const body = await pushplusJson("https://www.pushplus.plus/api/common/openApi/getAccessKey", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: env.PUSHPLUS_TOKEN, secretKey: env.PUSHPLUS_SECRET_KEY }) });
    const data = asObject(body.data);
    if (typeof data?.accessKey !== "string" || typeof data.expiresIn !== "number")
        throw new Error("pushplus_invalid_access_response");
    await env.DB.prepare("INSERT INTO pushplus_access_cache(id,access_key,expires_at) VALUES(1,?1,?2) ON CONFLICT(id) DO UPDATE SET access_key=excluded.access_key,expires_at=excluded.expires_at").bind(data.accessKey, now + data.expiresIn).run();
    return data.accessKey;
}
async function bindingQr(env: AppEnv, user: SessionUserRow) {
    const settings = await reminderSettings(env);
    if (!ready(env) || !settings.siteUrl)
        return error("管理员尚未配置微信提醒，请稍后再绑定。", 503);
    const code = randomToken();
    const result = await env.DB.prepare(`INSERT INTO notification_preferences(user_id,binding_code,binding_expires_at,qr_requested_at)
    VALUES(?1,?2,datetime('now','+10 minutes'),CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET binding_code=excluded.binding_code,
    binding_expires_at=excluded.binding_expires_at,qr_requested_at=CURRENT_TIMESTAMP WHERE qr_requested_at IS NULL OR qr_requested_at < datetime('now','-1 minute')`).bind(user.id, code).run();
    if (!result.meta.changes)
        return error("请一分钟后再刷新二维码。", 429);
    try {
        const key = await accessKey(env);
        const body = await pushplusJson(`https://www.pushplus.plus/api/open/friend/getQrCode?content=${code}&second=600&scanCount=1`, { headers: { "access-key": key } });
        const data = asObject(body.data);
        if (typeof data?.qrCodeImgUrl !== "string" || !data.qrCodeImgUrl.startsWith("https://mp.weixin.qq.com/"))
            throw new Error("pushplus_invalid_qr_response");
        return json({ url: data.qrCodeImgUrl, expiresIn: 600 });
    }
    catch {
        return error("二维码生成失败，请检查 pushplus 配置与安全 IP 设置。", 502);
    }
}
async function callback(request: Request, env: AppEnv, secret: string) {
    if (!env.PUSHPLUS_CALLBACK_SECRET)
        return error("回调不可用。", 503);
    const [actual, expected] = await Promise.all([sha256Hex(secret), sha256Hex(env.PUSHPLUS_CALLBACK_SECRET)]);
    if (!timingSafeEqual(encoder.encode(actual), encoder.encode(expected)))
        return error("回调验证失败。", 403);
    const body = await readBody(request);
    if (!body)
        return error("回调内容无效。", 400);
    if (body.event === "add_friend") {
        const friend = asObject(body.friendInfo);
        const code = readString(body, "qrCode");
        if (!/^[a-f0-9]{64}$/.test(code) || typeof friend?.token !== "string" || !/^[a-f0-9]{32}$/i.test(friend.token) || friend.isFollow !== 1)
            return error("绑定回调无效。", 400);
        try {
            await env.DB.prepare("UPDATE notification_preferences SET friend_token=?1,enabled=1,binding_code=NULL,binding_expires_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE binding_code=?2 AND binding_expires_at > datetime('now')").bind(friend.token, code).run();
        }
        catch {
            return error("该微信账号已经绑定其他成员。", 409);
        }
    }
    else if (body.event === "message_complate") {
        const info = asObject(body.messageInfo);
        if (typeof info?.shortCode !== "string" || ![2, 3].includes(Number(info.sendStatus)))
            return error("发送结果无效。", 400);
        await env.DB.prepare("INSERT OR IGNORE INTO pushplus_receipts(short_code,status) VALUES(?1,?2)").bind(info.shortCode, info.sendStatus === 2 ? "sent" : "failed").run();
        await env.DB.prepare("UPDATE reminder_deliveries SET status=?1,error_code=?2,updated_at=CURRENT_TIMESTAMP WHERE short_code=?3 AND status IN ('processing','queued')")
            .bind(info.sendStatus === 2 ? "sent" : "failed", info.sendStatus === 3 ? "provider_delivery_failed" : null, info.shortCode).run();
    }
    return json({ ok: true });
}
async function adminReminderSettings(env: AppEnv) {
    const settings = await reminderSettings(env);
    return json({ enabled: Boolean(settings.enabled), reminderTime: settings.reminderTime, siteUrl: settings.siteUrl,
        configured: { token: Boolean(env.PUSHPLUS_TOKEN), secretKey: Boolean(env.PUSHPLUS_SECRET_KEY), callbackSecret: Boolean(env.PUSHPLUS_CALLBACK_SECRET) },
        callbackUrl: settings.siteUrl && env.PUSHPLUS_CALLBACK_SECRET ? callbackUrl(env, settings.siteUrl) : null });
}
async function saveReminderSettings(request: Request, env: AppEnv) {
    const body = await readBody(request);
    if (!body || typeof body.enabled !== "boolean" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(readString(body, "reminderTime")))
        return error("提醒时间无效。", 400);
    let siteUrl = readString(body, "siteUrl").replace(/\/+$/, "");
    if (siteUrl) {
        try {
            const url = new URL(siteUrl);
            if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
                return error("请输入 HTTPS 网站根地址。", 400);
            siteUrl = url.origin;
        }
        catch {
            return error("网站地址无效。", 400);
        }
    }
    if (body.enabled && (!ready(env) || !siteUrl))
        return error("请先配置 pushplus 凭据与公开网站地址。", 400);
    await env.DB.prepare("UPDATE reminder_settings SET enabled=?1,reminder_time=?2,site_url=?3 WHERE id=1").bind(body.enabled ? 1 : 0, readString(body, "reminderTime"), siteUrl).run();
    return adminReminderSettings(env);
}
export async function runReminders(env: AppEnv, now = new Date()) {
    const date = beijingDate(now);
    await snapshotDay(env, date);
    const settings = await reminderSettings(env);
    if (!settings.enabled || !ready(env) || !settings.siteUrl || beijingTime(now) < settings.reminderTime)
        return { queued: 0 };
    const slot = now.toISOString().slice(0, 16);
    const claimedSlot = await env.DB.prepare("INSERT OR IGNORE INTO reminder_slots(slot) VALUES(?1)").bind(slot).run();
    if (!claimedSlot.meta.changes)
        return { queued: 0 };
    const candidates = await env.DB.prepare(`SELECT u.id,n.friend_token AS friendToken,COUNT(d.task_id) AS remaining
    FROM users u JOIN notification_preferences n ON n.user_id=u.id AND n.enabled=1 AND n.friend_token IS NOT NULL
    JOIN task_days d ON d.local_date=?1 AND d.due=1
    LEFT JOIN task_checkins c ON c.user_id=u.id AND c.task_id=d.task_id AND c.local_date=d.local_date
    WHERE u.status='active' AND u.password_hash IS NOT NULL AND c.id IS NULL AND NOT EXISTS
    (SELECT 1 FROM reminder_deliveries r WHERE r.user_id=u.id AND r.local_date=?1)
    GROUP BY u.id ORDER BY u.id LIMIT 10`).bind(date).all<{
        id: string;
        friendToken: string;
        remaining: number;
    }>();
    if (!candidates.results.length)
        return { queued: 0 };
    // Group messages carry a general reminder; each recipient's link opens their own remaining tasks.
    const claimed: Array<{
        id: string;
        friendToken: string;
        remaining: number;
        deliveryId: string;
    }> = [];
    const group = candidates.results.filter(member => member.remaining === candidates.results[0].remaining);
    for (const member of group) {
        const id = crypto.randomUUID();
        const result = await env.DB.prepare(`INSERT OR IGNORE INTO reminder_deliveries(id,user_id,local_date,status)
      SELECT ?1,?2,?3,'processing' WHERE EXISTS(SELECT 1 FROM notification_preferences WHERE user_id=?2 AND enabled=1 AND friend_token=?4)
      AND EXISTS(SELECT 1 FROM task_days d WHERE d.local_date=?3 AND d.due=1 AND NOT EXISTS
      (SELECT 1 FROM task_checkins c WHERE c.user_id=?2 AND c.task_id=d.task_id AND c.local_date=d.local_date))`).bind(id, member.id, date, member.friendToken).run();
        if (result.meta.changes)
            claimed.push({ ...member, deliveryId: id });
    }
    if (!claimed.length)
        return { queued: 0 };
    try {
        const content = `今天还有 ${claimed[0].remaining} 项任务未完成。`;
        const body = await pushplusJson("https://www.pushplus.plus/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
                token: env.PUSHPLUS_TOKEN, to: claimed.map(member => member.friendToken).join(","), channel: "wechat", template: "html", title: "息间 · 今日打卡提醒",
                content: `<p>${content}</p><p><a href="${settings.siteUrl}/">去打卡</a></p><p>可在个人设置中关闭提醒。</p>`, callbackUrl: callbackUrl(env, settings.siteUrl), timestamp: now.getTime() + 120000,
            }) });
        const code = typeof body.data === "string" ? body.data : typeof asObject(body.data)?.shortCode === "string" ? String(asObject(body.data)?.shortCode) : "";
        if (!code)
            throw new Error("pushplus_missing_short_code");
        await env.DB.batch(claimed.map(member => env.DB.prepare(`UPDATE reminder_deliveries SET status=COALESCE((SELECT status FROM pushplus_receipts WHERE short_code=?1),'queued'),short_code=?1,
      error_code=CASE WHEN (SELECT status FROM pushplus_receipts WHERE short_code=?1)='failed' THEN 'provider_delivery_failed' ELSE NULL END,
      updated_at=CURRENT_TIMESTAMP WHERE id=?2`).bind(code, member.deliveryId)));
        return { queued: claimed.length };
    }
    catch (cause) {
        const code = cause instanceof Error && /^pushplus_\d+$/.test(cause.message) ? cause.message : "request_failed_or_unknown";
        await env.DB.batch(claimed.map(member => env.DB.prepare("UPDATE reminder_deliveries SET status='failed',error_code=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2").bind(code, member.deliveryId)));
        return { queued: 0 };
    }
    finally {
        await env.DB.prepare("DELETE FROM reminder_slots WHERE created_at < datetime('now','-2 days')").run();
        await env.DB.prepare("DELETE FROM pushplus_receipts WHERE created_at < datetime('now','-7 days')").run();
    }
}
async function route(request: Request, env: AppEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();
    const callbackMatch = path.match(/^\/api\/pushplus\/callback\/([a-f0-9]{64})$/);
    if (method === "POST" && callbackMatch)
        return callback(request, env, callbackMatch[1]);
    if (!["GET", "HEAD"].includes(method)) {
        const origin = request.headers.get("Origin");
        if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site")
            return error("请求来源无效。", 403);
    }
    if (path === "/api/health" && method === "GET")
        return json({ status: "ok" });
    if (path === "/api/auth/register" && method === "POST") {
        const body = await readBody(request.clone());
        if (body && readString(body, "email").toLowerCase() === env.ADMIN_EMAIL?.toLowerCase())
            return error("管理员账号请使用已有账号登录。", 403);
        return handleRegister(request, env);
    }
    if (path === "/api/auth/login" && method === "POST")
        return handleLogin(request, env);
    if (path === "/api/auth/logout" && method === "POST")
        return handleLogout(request, env);
    const user = await currentUser(request, env);
    if (path === "/api/me" && method === "GET")
        return json({ user: user ? publicUser(user) : null });
    if (!user)
        return error("请先登录。", 401);
    if (path === "/api/today" && method === "GET")
        return today(env, user);
    if (path === "/api/records" && method === "GET")
        return records(request, env, user);
    if (path === "/api/records/day" && method === "GET")
        return recordDetail(request, env, user);
    if (path === "/api/assets/upload" && method === "POST")
        return upload(request, env, user);
    const assetMatch = path.match(/^\/api\/assets\/(.+)$/);
    if (assetMatch && method === "GET")
        return asset(request, env, user, assetMatch[1]);
    const checkinMatch = path.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)\/checkin$/);
    if (checkinMatch && method === "POST")
        return checkin(request, env, user, checkinMatch[1]);
    if (checkinMatch && method === "DELETE")
        return undo(request, env, user, checkinMatch[1]);
    if (path === "/api/notifications" && method === "GET")
        return preferences(env, user);
    if (path === "/api/notifications" && method === "PUT")
        return setPreference(request, env, user);
    if (path === "/api/notifications" && method === "DELETE")
        return unbind(env, user);
    if (path === "/api/notifications/qr" && method === "POST")
        return bindingQr(env, user);
    if (path.startsWith("/api/admin/") && user.role !== "admin")
        return error("仅管理员可以执行此操作。", 403);
    if (path === "/api/admin/tasks" && method === "GET") {
        const tasks = await env.DB.prepare("SELECT id,title,description,weekday_mask AS weekdayMask,image_policy AS imagePolicy,active FROM tasks ORDER BY created_at,id").all();
        return json({ tasks: tasks.results });
    }
    if (path === "/api/admin/tasks" && method === "POST")
        return saveTask(request, env, user);
    const editMatch = path.match(/^\/api\/admin\/tasks\/([a-zA-Z0-9-]+)$/);
    if (editMatch && method === "PUT")
        return saveTask(request, env, user, editMatch[1]);
    if (path === "/api/admin/overview" && method === "GET")
        return adminOverview(request, env);
    if (path === "/api/admin/reminders" && method === "GET")
        return adminReminderSettings(env);
    if (path === "/api/admin/reminders" && method === "PUT")
        return saveReminderSettings(request, env);
    return error("没有找到这个接口。", 404);
}
export default {
    async fetch(request: Request, env: AppEnv) {
        if (!new URL(request.url).pathname.startsWith("/api/"))
            return new Response(null, { status: 404 });
        try {
            return await route(request, env);
        }
        catch (cause) {
            console.error(JSON.stringify({ message: "api failed", error: cause instanceof Error ? cause.message : "unknown" }));
            return error("服务暂时不可用，请稍后重试。", 500);
        }
    },
    async scheduled(controller: ScheduledController, env: AppEnv, ctx: ExecutionContext) {
        ctx.waitUntil(runReminders(env, new Date(controller.scheduledTime)));
    },
} satisfies ExportedHandler<AppEnv>;
