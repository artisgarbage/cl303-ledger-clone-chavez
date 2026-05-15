import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAdmin, requireRole, requireSession, requireTenant } from "./auth-helpers";
import * as authModule from "./auth";

// Mock the auth module
vi.mock("./auth", () => ({
  auth: vi.fn(),
}));

describe("auth-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAdmin", () => {
    it("should return session for admin user with companyId", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "admin@test.com",
          role: "ADMIN",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      const result = await requireAdmin();
      expect(result.user.companyId).toBe("company1");
      expect(result.user.role).toBe("ADMIN");
    });

    it("should throw for non-admin user", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "member@test.com",
          role: "MEMBER",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireAdmin()).rejects.toThrow("Forbidden: Admin role required");
    });

    it("should throw for unauthenticated request", async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    });

    it("should throw if companyId is missing (SEC-03 schema constraint)", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "admin@test.com",
          role: "ADMIN",
          companyId: null,
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireAdmin()).rejects.toThrow("Invalid session: companyId missing");
    });
  });

  describe("requireRole", () => {
    it("should accept single role string", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "admin@test.com",
          role: "ADMIN",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      const result = await requireRole("ADMIN");
      expect(result.user.role).toBe("ADMIN");
      expect(result.user.companyId).toBe("company1");
    });

    it("should accept array of roles", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "member@test.com",
          role: "MEMBER",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      const result = await requireRole(["ADMIN", "MEMBER"]);
      expect(result.user.role).toBe("MEMBER");
    });

    it("should throw if user role not in allowed list", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "viewer@test.com",
          role: "VIEWER",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireRole(["ADMIN", "MEMBER"])).rejects.toThrow(
        "Forbidden: One of these roles required: ADMIN, MEMBER"
      );
    });

    it("should throw for unauthenticated request", async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);

      await expect(requireRole("ADMIN")).rejects.toThrow("Unauthorized");
    });

    it("should throw if role is missing", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "user@test.com",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireRole("ADMIN")).rejects.toThrow("Invalid session");
    });

    it("should throw if companyId is missing", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "user@test.com",
          role: "ADMIN",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireRole("ADMIN")).rejects.toThrow("Invalid session");
    });
  });

  describe("requireSession", () => {
    it("should return session for authenticated user with companyId", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "user@test.com",
          companyId: "company1",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      const result = await requireSession();
      expect(result.user.companyId).toBe("company1");
    });

    it("should throw for unauthenticated request", async () => {
      vi.mocked(authModule.auth).mockResolvedValue(null);

      await expect(requireSession()).rejects.toThrow("Unauthorized");
    });

    it("should throw if companyId is missing", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "user@test.com",
          companyId: null,
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireSession()).rejects.toThrow("Invalid session: companyId missing");
    });
  });

  describe("requireTenant", () => {
    it("should return companyId string", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "user@test.com",
          companyId: "company123",
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      const companyId = await requireTenant();
      expect(companyId).toBe("company123");
      expect(typeof companyId).toBe("string");
    });

    it("should throw if session has no companyId", async () => {
      const mockSession = {
        user: {
          id: "user1",
          email: "user@test.com",
          companyId: undefined,
        },
      };
      vi.mocked(authModule.auth).mockResolvedValue(mockSession as any);

      await expect(requireTenant()).rejects.toThrow("Invalid session: companyId missing");
    });
  });
});
