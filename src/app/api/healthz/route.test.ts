import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

async function callGET() {
  const res = await GET();
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

describe("GET /api/healthz", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process, "uptime").mockReturnValue(120.456);
  });

  describe("healthy state", () => {
    it("returns 200 when DB ping succeeds", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      const { status, body } = await callGET();
      expect(status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.db).toBe("ok");
    });

    it("rounds uptime to one decimal place", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      const { body } = await callGET();
      expect(body.uptime).toBe(120.5);
    });

    it("includes a valid ISO 8601 timestamp", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      const { body } = await callGET();
      const ts = body.timestamp as string;
      expect(new Date(ts).toISOString()).toBe(ts);
    });

    it("includes version from npm_package_version env var", async () => {
      process.env.npm_package_version = "1.2.3";
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      const { body } = await callGET();
      expect(body.version).toBe("1.2.3");
    });

    it("falls back to 'unknown' when npm_package_version is unset", async () => {
      delete process.env.npm_package_version;
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      const { body } = await callGET();
      expect(body.version).toBe("unknown");
    });
  });

  describe("degraded state (DB unreachable)", () => {
    it("returns 503 when DB ping throws", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("ECONNREFUSED"));
      const { status, body } = await callGET();
      expect(status).toBe(503);
      expect(body.status).toBe("degraded");
      expect(body.db).toBe("error");
    });

    it("does not leak the internal error message in the response body", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("ECONNREFUSED"));
      const { body } = await callGET();
      expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    });

    it("still includes uptime and timestamp when degraded", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("timeout"));
      const { body } = await callGET();
      expect(typeof body.uptime).toBe("number");
      expect(typeof body.timestamp).toBe("string");
    });
  });
});
