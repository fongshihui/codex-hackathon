import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";

const memoryCache = new Map();
let redisDisabled = false;

export async function readCache(namespace, key) {
  const cacheKey = scopedKey(namespace, key);
  const redisValue = await readRedis(cacheKey);
  if (redisValue !== null) return redisValue;

  const cached = memoryCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return cached.value;
}

export async function writeCache(namespace, key, value, ttlMs) {
  const cacheKey = scopedKey(namespace, key);
  await writeRedis(cacheKey, value, ttlMs);
  memoryCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function scopedKey(namespace, key) {
  const digest = crypto.createHash("sha256").update(String(key)).digest("hex");
  return `interview-prep-studio:${namespace}:${digest}`;
}

async function readRedis(key) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisDisabled) return null;

  try {
    const response = await sendRedisCommand(redisUrl, ["GET", key]);
    if (response === null) return null;
    return JSON.parse(response);
  } catch {
    redisDisabled = true;
    return null;
  }
}

async function writeRedis(key, value, ttlMs) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisDisabled) return;

  try {
    await sendRedisCommand(redisUrl, ["SET", key, JSON.stringify(value), "PX", String(ttlMs)]);
  } catch {
    redisDisabled = true;
  }
}

function sendRedisCommand(redisUrl, command) {
  const parsed = new URL(redisUrl);
  const isTls = parsed.protocol === "rediss:";
  const port = Number(parsed.port || (isTls ? 6380 : 6379));
  const host = parsed.hostname || "127.0.0.1";
  const timeoutMs = Number(process.env.REDIS_TIMEOUT_MS || 600);

  return new Promise((resolve, reject) => {
    const socket = (isTls ? tls : net).connect({ host, port });
    let buffer = Buffer.alloc(0);
    let isReady = false;
    const commands = [];

    if (parsed.password) {
      commands.push(["AUTH", decodeURIComponent(parsed.password)]);
    }
    commands.push(command);

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("Redis timed out."));
    }, timeoutMs);

    socket.on("connect", () => {
      isReady = true;
      socket.write(commands.map(encodeCommand).join(""));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsedResponse = parseRedisResponses(buffer, commands.length);
      if (!parsedResponse) return;
      clearTimeout(timer);
      socket.end();
      const last = parsedResponse[parsedResponse.length - 1];
      if (last instanceof Error) reject(last);
      else resolve(last);
    });

    socket.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    socket.on("close", () => {
      clearTimeout(timer);
      if (!isReady) reject(new Error("Redis connection closed."));
    });
  });
}

function encodeCommand(parts) {
  return `*${parts.length}\r\n${parts.map((part) => {
    const value = String(part);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }).join("")}`;
}

function parseRedisResponses(buffer, count) {
  const responses = [];
  let offset = 0;

  while (responses.length < count) {
    const parsed = parseRedisValue(buffer, offset);
    if (!parsed) return null;
    responses.push(parsed.value);
    offset = parsed.offset;
  }

  return responses;
}

function parseRedisValue(buffer, offset) {
  const prefix = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf("\r\n", offset);
  if (lineEnd === -1) return null;
  const line = buffer.toString("utf8", offset + 1, lineEnd);
  const nextOffset = lineEnd + 2;

  if (prefix === "+") return { value: line, offset: nextOffset };
  if (prefix === "-") return { value: new Error(line), offset: nextOffset };
  if (prefix === ":") return { value: Number(line), offset: nextOffset };
  if (prefix === "$") {
    const length = Number(line);
    if (length === -1) return { value: null, offset: nextOffset };
    const end = nextOffset + length;
    if (buffer.length < end + 2) return null;
    return {
      value: buffer.toString("utf8", nextOffset, end),
      offset: end + 2,
    };
  }

  return { value: new Error("Unsupported Redis response."), offset: nextOffset };
}
