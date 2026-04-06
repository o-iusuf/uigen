// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieStore = {
  set: mockCookieSet,
  delete: mockCookieDelete,
  get: mockCookieGet,
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession, getSession, deleteSession, verifySession } = await import(
  "@/lib/auth"
);

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

async function makeToken(payload: Record<string, unknown>, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createSession ────────────────────────────────────────────────────────────

describe("createSession", () => {
  test("sets a cookie named auth-token", async () => {
    await createSession("user-1", "test@example.com");
    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name] = mockCookieSet.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
  });

  test("cookie is httpOnly, lax, and at root path", async () => {
    await createSession("user-1", "test@example.com");
    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();
    const [, , options] = mockCookieSet.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("JWT contains userId and email", async () => {
    await createSession("user-42", "hello@example.com");
    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("JWT expires in 7 days", async () => {
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-1", "test@example.com");
    const after = Math.floor(Date.now() / 1000);
    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sevenDays = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDays - 5);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDays + 5);
  });
});

// ─── getSession ───────────────────────────────────────────────────────────────

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({
      userId: "user-1",
      email: "test@example.com",
      expiresAt: new Date(),
    });
    mockCookieGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for an expired token", async () => {
    // Backdate: manually craft an already-expired token
    const expiredToken = await new SignJWT({ userId: "user-1", email: "x@x.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .setIssuedAt()
      .sign(JWT_SECRET);
    mockCookieGet.mockReturnValue({ value: expiredToken });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a tampered token", async () => {
    mockCookieGet.mockReturnValue({ value: "not.a.valid.token" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-1", email: "test@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);
    mockCookieGet.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns null when cookie value is an empty string", async () => {
    mockCookieGet.mockReturnValue({ value: "" });
    expect(await getSession()).toBeNull();
  });

  test("preserves all payload fields from the token", async () => {
    const expiresAt = new Date();
    const token = await makeToken({ userId: "user-5", email: "full@example.com", expiresAt });
    mockCookieGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session?.userId).toBe("user-5");
    expect(session?.email).toBe("full@example.com");
  });
});

// ─── deleteSession ────────────────────────────────────────────────────────────

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieDelete).toHaveBeenCalledOnce();
    expect(mockCookieDelete).toHaveBeenCalledWith(COOKIE_NAME);
  });
});

// ─── verifySession ────────────────────────────────────────────────────────────

describe("verifySession", () => {
  function makeRequest(token?: string) {
    const headers = new Headers();
    if (token) headers.append("cookie", `${COOKIE_NAME}=${token}`);
    return new Request("http://localhost/", { headers }) as any;
  }

  test("returns null when no cookie is present", async () => {
    const req = makeRequest();
    // Simulate NextRequest shape
    req.cookies = { get: () => undefined };
    expect(await verifySession(req)).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await makeToken({
      userId: "user-99",
      email: "verify@example.com",
      expiresAt: new Date(),
    });
    const req = makeRequest(token);
    req.cookies = { get: () => ({ value: token }) };
    const session = await verifySession(req);
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("verify@example.com");
  });

  test("returns null for an invalid token", async () => {
    const req = makeRequest("bad.token");
    req.cookies = { get: () => ({ value: "bad.token" }) };
    expect(await verifySession(req)).toBeNull();
  });
});
