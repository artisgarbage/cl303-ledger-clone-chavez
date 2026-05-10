import { describe, it, expect, vi, beforeEach } from "vitest";
import { logAccess, extractRequestMetadata } from "./audit";
import { prisma } from "./prisma";

// Mock the prisma client
vi.mock("./prisma", () => ({
  prisma: {
    accessAudit: {
      create: vi.fn(),
    },
  },
}));

describe("audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logAccess", () => {
    it("should create an access audit record with all fields", async () => {
      const params = {
        userId: "user-123",
        companyId: "company-456",
        action: "read" as const,
        resource: "narrative" as const,
        resourceId: "narrative-789",
        metadata: { routePath: "/api/narratives/789", method: "GET" },
      };

      await logAccess(params);

      expect(prisma.accessAudit.create).toHaveBeenCalledWith({
        data: params,
      });
    });

    it("should create an access audit record without optional fields", async () => {
      const params = {
        userId: "user-123",
        companyId: "company-456",
        action: "delete" as const,
        resource: "period" as const,
      };

      await logAccess(params);

      expect(prisma.accessAudit.create).toHaveBeenCalledWith({
        data: {
          ...params,
          resourceId: undefined,
          metadata: undefined,
        },
      });
    });

    it("should not throw if audit logging fails", async () => {
      const mockCreate = vi.mocked(prisma.accessAudit.create);
      mockCreate.mockRejectedValueOnce(new Error("Database error"));

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(
        logAccess({
          userId: "user-123",
          companyId: "company-456",
          action: "create",
          resource: "project",
        })
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[audit] Failed to log access:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("extractRequestMetadata", () => {
    it("should extract pathname from nextUrl", () => {
      const req = {
        nextUrl: { pathname: "/api/narratives/123" },
        method: "GET",
        headers: new Headers({
          "user-agent": "Mozilla/5.0",
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        }),
      };

      const metadata = extractRequestMetadata(req);

      expect(metadata).toEqual({
        routePath: "/api/narratives/123",
        method: "GET",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });
    });

    it("should extract pathname from url if nextUrl is missing", () => {
      const req = {
        url: "https://example.com/api/periods",
        method: "DELETE",
        headers: new Headers({}),
      };

      const metadata = extractRequestMetadata(req);

      expect(metadata).toEqual({
        routePath: "/api/periods",
        method: "DELETE",
        ipAddress: "unknown",
        userAgent: "unknown",
      });
    });

    it("should use x-real-ip if x-forwarded-for is missing", () => {
      const req = {
        nextUrl: { pathname: "/api/narratives" },
        method: "POST",
        headers: new Headers({
          "x-real-ip": "203.0.113.42",
        }),
      };

      const metadata = extractRequestMetadata(req);

      expect(metadata.ipAddress).toBe("203.0.113.42");
    });

    it("should default to unknown values if headers are missing", () => {
      const req = {};

      const metadata = extractRequestMetadata(req);

      expect(metadata).toEqual({
        routePath: "unknown",
        method: "GET",
        ipAddress: "unknown",
        userAgent: "unknown",
      });
    });
  });
});
