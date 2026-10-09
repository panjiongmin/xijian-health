import { randomUUID, randomBytes, pbkdf2Sync } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const email = config.vars.ADMIN_EMAIL.toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("先在 wrangler.jsonc 配置 ADMIN_EMAIL。");
let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("管理员初始密码（输入仅用于初始化）：");
  rl.close();
}
if (password.length < 6 || password.length > 72) throw new Error("初始密码需要 6–72 位。");
const salt = randomBytes(16);
const hash = `10000:${salt.toString("hex")}:${pbkdf2Sync(password,salt,10000,32,"sha256").toString("hex")}`;
const id = randomUUID();
const sqlQuote = value => "'" + value.replaceAll("'","''") + "'";
const sql = `INSERT OR IGNORE INTO users(id,email,password_hash,display_name) VALUES(${sqlQuote(id)},${sqlQuote(email)},${sqlQuote(hash)},'管理员');
INSERT OR IGNORE INTO community_profiles(user_id,nickname,avatar_code,visibility) SELECT id,display_name,'moss','private' FROM users WHERE email=${sqlQuote(email)};`;
mkdirSync(".wrangler",{recursive:true});
const path = `.wrangler/admin-${id}.sql`;
writeFileSync(path,sql);
try {
  const result = spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","d1","execute",config.d1_databases[0].database_name,"--local","--file",path],{stdio:"inherit"});
  if(result.status !== 0) process.exitCode=1;
} finally { unlinkSync(path); }
