import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, DELETE } from "./route";
import { prisma } from "@/lib/prisma";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/users/user-123", {
      method: "PATCH",
      body: JSON.stringify({ role: "VIEWER" }),
    });

    const params = Promise.resolve({ id: "user-123" });
    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should reject non-admin users", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com", role: "MEMBER" },
    } as any);

    const req = new NextRequest("http://localhost/api/admin/users/user-123", {
      method: "PATCH",
      body: JSON.stringify({ role: "VIEWER" }),
    });

    const params = Promise.resolve({ id: "user-123" });
    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should reject requests for users in a different company (IDOR protection)", async () => {
    // Admin from Company A
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@companyA.com",
        role: "ADMIN",
        companyId: "company-a",
      },
    } as any);

    // Mock user lookup — target user belongs to Company B
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-b1",
      companyId: "company-b", // Different company!
      email: "user@companyB.com",
      name: "User B",
      role: "MEMBER",
      password: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/admin/users/user-b1", {
      method: "PATCH",
      body: JSON.stringify({ role: "VIEWER" }),
    });

    const params = Promise.resolve({ id: "user-b1" });
    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should allow admin to update user in the same company", async () => {
    // Admin from Company A
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@companyA.com",
        role: "ADMIN",
        companyId: "company-a",
      },
    } as any);

    // Mock user lookup — target user belongs to same company
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-a2",
      companyId: "company-a", // Same company
      email: "user@companyA.com",
      name: "User A2",
      role: "MEMBER",
      password: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock update
    vi.spyOn(prisma.user, "update").mockResolvedValue({
      id: "user-a2",
      email: "user@companyA.com",
      name: "User A2",
      role: "VIEWER",
      companyId: "company-a",
      password: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/admin/users/user-a2", {
      method: "PATCH",
      body: JSON.stringify({ role: "VIEWER" }),
    });

    const params = Promise.resolve({ id: "user-a2" });
    const response = await PATCH(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.role).toBe("VIEWER");
  });
});

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/admin/users/user-123", {
      method: "DELETE",
    });

    const params = Promise.resolve({ id: "user-123" });
    const response = await DELETE(req, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should reject deletion of users in a different company (IDOR protection)", async () => {
    // Admin from Company A
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@companyA.com",
        role: "ADMIN",
        companyId: "company-a",
      },
    } as any);

    // Mock user lookup — target user belongs to Company B
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-b1",
      companyId: "company-b", // Different company!
      email: "user@companyB.com",
      name: "User B",
      role: "MEMBER",
      password: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/admin/users/user-b1", {
      method: "DELETE",
    });

    const params = Promise.resolve({ id: "user-b1" });
    const response = await DELETE(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should allow admin to delete user in the same company", async () => {
    // Admin from Company A
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@companyA.com",
        role: "ADMIN",
        companyId: "company-a",
      },
    } as any);

    // Mock user lookup — target user belongs to same company
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-a2",
      companyId: "company-a", // Same company
      email: "user@companyA.com",
      name: "User A2",
      role: "MEMBER",
      password: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mock delete
    vi.spyOn(prisma.user, "delete").mockResolvedValue({
      id: "user-a2",
      email: "user@companyA.com",
      name: "User A2",
      role: "MEMBER",
      companyId: "company-a",
      password: null,
      image: null,
      emailVerified: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/admin/users/user-a2", {
      method: "DELETE",
    });

    const params = Promise.resolve({ id: "user-a2" });
    const response = await DELETE(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it("should reject admin trying to delete their own account", async () => {
    // Admin from Company A
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-1",
        email: "admin@companyA.com",
        role: "ADMIN",
        companyId: "company-a",
      },
    } as any);

    const req = new NextRequest("http://localhost/api/admin/users/admin-1", {
      method: "DELETE",
    });

    const params = Promise.resolve({ id: "admin-1" });
    const response = await DELETE(req, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Cannot delete your own account");
  });
});
