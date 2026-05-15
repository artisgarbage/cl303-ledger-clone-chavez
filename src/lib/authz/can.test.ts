import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Session } from "next-auth";
import { can, assertCan } from "./can";
import { AuthorizationDenied, TenantMismatch } from "./errors";
import * as audit from "@/lib/audit";

// Mock the audit module
vi.mock("@/lib/audit", () => ({
  logAccess: vi.fn().mockResolvedValue(undefined),
}));

describe("can()", () => {
  const mockSession: Session = {
    user: {
      id: "user-1",
      email: "admin@example.com",
      role: "ADMIN",
      companyId: "company-1",
    },
    expires: "2099-12-31",
  };

  it("should return true when user has the capability", async () => {
    const result = await can(mockSession, "narratives.read");
    expect(result).toBe(true);
  });

  it("should return false when user lacks the capability", async () => {
    const viewerSession: Session = {
      ...mockSession,
      user: { ...mockSession.user, role: "VIEWER" },
    };
    const result = await can(viewerSession, "narratives.generate");
    expect(result).toBe(false);
  });

  it("should return false when session is null", async () => {
    const result = await can(null, "narratives.read");
    expect(result).toBe(false);
  });

  it("should return false when session.user is missing", async () => {
    const result = await can({ expires: "2099-12-31" } as Session, "narratives.read");
    expect(result).toBe(false);
  });

  it("should return false when role is missing", async () => {
    const badSession: Session = {
      user: { id: "user-1", companyId: "company-1" },
      expires: "2099-12-31",
    };
    const result = await can(badSession, "narratives.read");
    expect(result).toBe(false);
  });

  it("should return false when companyId is missing", async () => {
    const badSession: Session = {
      user: { id: "user-1", role: "ADMIN" },
      expires: "2099-12-31",
    };
    const result = await can(badSession, "narratives.read");
    expect(result).toBe(false);
  });

  describe("tenant isolation", () => {
    it("should return true when resource companyId matches user companyId", async () => {
      const result = await can(mockSession, "narratives.read", {
        companyId: "company-1",
      });
      expect(result).toBe(true);
    });

    it("should return false when resource companyId does not match", async () => {
      const result = await can(mockSession, "narratives.read", {
        companyId: "company-2",
      });
      expect(result).toBe(false);
    });

    it("should return true when resource has no companyId", async () => {
      const result = await can(mockSession, "narratives.read", {
        id: "resource-1",
      });
      expect(result).toBe(true);
    });
  });

  describe("role-specific capabilities", () => {
    it("VIEWER can read but not write", async () => {
      const viewerSession: Session = {
        ...mockSession,
        user: { ...mockSession.user, role: "VIEWER" },
      };
      expect(await can(viewerSession, "narratives.read")).toBe(true);
      expect(await can(viewerSession, "narratives.generate")).toBe(false);
      expect(await can(viewerSession, "people.write")).toBe(false);
    });

    it("MEMBER can write ledger data", async () => {
      const memberSession: Session = {
        ...mockSession,
        user: { ...mockSession.user, role: "MEMBER" },
      };
      expect(await can(memberSession, "narratives.generate")).toBe(true);
      expect(await can(memberSession, "people.write")).toBe(true);
      expect(await can(memberSession, "billing.manage")).toBe(false);
    });

    it("ADMIN can manage billing and team", async () => {
      expect(await can(mockSession, "billing.manage")).toBe(true);
      expect(await can(mockSession, "members.invite")).toBe(true);
      expect(await can(mockSession, "admin.users.write")).toBe(true);
    });
  });
});

describe("assertCan()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession: Session = {
    user: {
      id: "user-1",
      email: "admin@example.com",
      role: "ADMIN",
      companyId: "company-1",
    },
    expires: "2099-12-31",
  };

  it("should not throw when user has the capability", async () => {
    await expect(assertCan(mockSession, "narratives.read")).resolves.toBeUndefined();
  });

  it("should throw AuthorizationDenied when user lacks capability", async () => {
    const viewerSession: Session = {
      ...mockSession,
      user: { ...mockSession.user, role: "VIEWER" },
    };
    await expect(assertCan(viewerSession, "narratives.generate")).rejects.toThrow(
      AuthorizationDenied
    );
  });

  it("should throw AuthorizationDenied when session is null", async () => {
    await expect(assertCan(null, "narratives.read")).rejects.toThrow(
      AuthorizationDenied
    );
  });

  it("should throw AuthorizationDenied when session is invalid", async () => {
    const badSession: Session = {
      user: { id: "user-1" },
      expires: "2099-12-31",
    };
    await expect(assertCan(badSession, "narratives.read")).rejects.toThrow(
      AuthorizationDenied
    );
  });

  describe("tenant isolation", () => {
    it("should not throw when resource companyId matches", async () => {
      await expect(
        assertCan(mockSession, "narratives.read", { companyId: "company-1" })
      ).resolves.toBeUndefined();
    });

    it("should throw TenantMismatch when resource companyId differs", async () => {
      await expect(
        assertCan(mockSession, "narratives.read", {
          companyId: "company-2",
          type: "narrative",
          id: "narrative-1",
        })
      ).rejects.toThrow(TenantMismatch);
    });

    it("should not throw when resource has no companyId", async () => {
      await expect(
        assertCan(mockSession, "narratives.read", { id: "resource-1" })
      ).resolves.toBeUndefined();
    });
  });

  describe("audit logging", () => {
    it("should log successful authorization", async () => {
      await assertCan(mockSession, "narratives.read", {
        companyId: "company-1",
        type: "narrative",
        id: "narrative-1",
      });

      expect(audit.logAccess).toHaveBeenCalledWith({
        userId: "user-1",
        companyId: "company-1",
        action: "authorized",
        resource: "narrative",
        resourceId: "narrative-1",
        metadata: {
          capability: "narratives.read",
          role: "ADMIN",
        },
      });
    });

    it("should log denied authorization", async () => {
      const viewerSession: Session = {
        ...mockSession,
        user: { ...mockSession.user, role: "VIEWER" },
      };

      await expect(
        assertCan(viewerSession, "narratives.generate", {
          type: "narrative",
        })
      ).rejects.toThrow();

      expect(audit.logAccess).toHaveBeenCalledWith({
        userId: "user-1",
        companyId: "company-1",
        action: "denied",
        resource: "narrative",
        resourceId: undefined,
        metadata: {
          reason: "missing_capability",
          capability: "narratives.generate",
          role: "VIEWER",
        },
      });
    });

    it("should log tenant mismatch", async () => {
      await expect(
        assertCan(mockSession, "narratives.read", {
          companyId: "company-2",
          type: "narrative",
          id: "narrative-1",
        })
      ).rejects.toThrow(TenantMismatch);

      expect(audit.logAccess).toHaveBeenCalledWith({
        userId: "user-1",
        companyId: "company-1",
        action: "denied",
        resource: "narrative",
        resourceId: "narrative-1",
        metadata: {
          reason: "tenant_mismatch",
          requestedCompanyId: "company-2",
          capability: "narratives.read",
        },
      });
    });
  });

  describe("cross-tenant denial scenarios", () => {
    it("should deny VIEWER from another company", async () => {
      const otherViewerSession: Session = {
        ...mockSession,
        user: {
          id: "user-2",
          role: "VIEWER",
          companyId: "company-2",
        },
      };

      await expect(
        assertCan(otherViewerSession, "narratives.read", {
          companyId: "company-1",
          type: "narrative",
        })
      ).rejects.toThrow(TenantMismatch);
    });

    it("should deny ADMIN from another company", async () => {
      const otherAdminSession: Session = {
        ...mockSession,
        user: {
          id: "user-3",
          role: "ADMIN",
          companyId: "company-2",
        },
      };

      await expect(
        assertCan(otherAdminSession, "narratives.read", {
          companyId: "company-1",
          type: "narrative",
        })
      ).rejects.toThrow(TenantMismatch);
    });
  });

  describe("error properties", () => {
    it("AuthorizationDenied should include capability", async () => {
      const viewerSession: Session = {
        ...mockSession,
        user: { ...mockSession.user, role: "VIEWER" },
      };

      try {
        await assertCan(viewerSession, "billing.manage");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationDenied);
        expect((error as AuthorizationDenied).capability).toBe("billing.manage");
      }
    });

    it("TenantMismatch should include both companyIds", async () => {
      try {
        await assertCan(mockSession, "narratives.read", {
          companyId: "company-2",
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TenantMismatch);
        expect((error as TenantMismatch).requestedCompanyId).toBe("company-2");
        expect((error as TenantMismatch).userCompanyId).toBe("company-1");
      }
    });
  });
});
