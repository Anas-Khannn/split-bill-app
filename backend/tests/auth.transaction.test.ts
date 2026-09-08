import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db/prisma.js", async () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
    },
  };
});

import { prisma } from "../src/db/prisma.js";
import { AuthRepository } from "../src/modules/auth/auth.repository.js";
import { hashRefreshToken } from "../src/modules/auth/refresh-token.util.js";

const mockPrisma = vi.mocked(prisma);

const rotatedRecord = {
  id: "rt-2",
  userId: "user-1",
  tokenHash: "b".repeat(64),
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  revokedAt: null,
  createdAt: new Date(),
};

function makeTx() {
  return {
    refreshToken: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      create: vi.fn().mockResolvedValue(rotatedRecord),
    },
  };
}

function runTransaction<T>(tx: T) {
  return async (callback: (t: T) => Promise<T>): Promise<T> => callback(tx);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthRepository refresh-token persistence", () => {
  it("looks up refresh tokens by their SHA-256 hash with only safe user fields", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      userId: "user-1",
      tokenHash: "a".repeat(64),
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      user: { id: "user-1", name: "Ahmed Raza", email: "ahmed@example.com" },
    });

    const repository = new AuthRepository();
    const record = await repository.findRefreshTokenByHash(hashRefreshToken("raw-token"));

    expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashRefreshToken("raw-token") },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    expect(record?.user.passwordHash).toBeUndefined();
  });

  it("persists only the token hash, never the plaintext token", async () => {
    const repository = new AuthRepository();
    const rawToken = "raw-refresh-token";
    await repository.createRefreshToken({
      userId: "user-1",
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: new Date(),
    });

    const stored = mockPrisma.refreshToken.create.mock.calls[0]?.[0].data;
    expect(stored.tokenHash).toBe(hashRefreshToken(rawToken));
    expect(stored.tokenHash).not.toBe(rawToken);
  });

  it("revokes a session idempotently through the revokedAt: null guard", async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const repository = new AuthRepository();
    await repository.revokeRefreshTokenById("rt-1");

    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: "rt-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("AuthRepository refresh-token rotation", () => {
  it("revokes the old session and persists the replacement in one transaction", async () => {
    const tx = makeTx();
    mockPrisma.$transaction.mockImplementation(runTransaction(tx));

    const repository = new AuthRepository();
    const result = await repository.rotateRefreshToken("rt-1", {
      userId: "user-1",
      tokenHash: "b".repeat(64),
      expiresAt: new Date(),
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: "rt-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: "b".repeat(64),
        expiresAt: expect.any(Date),
      },
    });
    expect(result?.id).toBe("rt-2");
  });

  it("returns null without creating a replacement when the old token was already revoked", async () => {
    const tx = makeTx();
    tx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.$transaction.mockImplementation(runTransaction(tx));

    const repository = new AuthRepository();
    const result = await repository.rotateRefreshToken("rt-1", {
      userId: "user-1",
      tokenHash: "b".repeat(64),
      expiresAt: new Date(),
    });

    expect(result).toBeNull();
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });

  it("rejects the whole rotation when the replacement write fails", async () => {
    const tx = makeTx();
    tx.refreshToken.create.mockRejectedValue(new Error("db boom"));
    mockPrisma.$transaction.mockImplementation(runTransaction(tx));

    const repository = new AuthRepository();
    await expect(
      repository.rotateRefreshToken("rt-1", {
        userId: "user-1",
        tokenHash: "c".repeat(64),
        expiresAt: new Date(),
      }),
    ).rejects.toThrow("db boom");
  });
});
