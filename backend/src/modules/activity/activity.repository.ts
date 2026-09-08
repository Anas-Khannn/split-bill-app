import type { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { METRIC, METRIC_LABEL, metrics } from "../../metrics/registry.js";

/**
 * Describes an activity event that another domain operation wants to record.
 * The actor (`userId`) is always derived from the authenticated requester by
 * the service layer - it is never accepted from the request body.
 *
 * The repository that performs the domain write supplies the group, amount,
 * currency, and timestamp from the record it just created, so the activity
 * event always mirrors the persisted state atomically.
 */
export interface ActivityEventInput {
  userId: string;
  type: ActivityType;
  message: string;
}

export interface CreateActivityEventData extends ActivityEventInput {
  groupId: string;
  amountMinorUnits?: bigint | null;
  currencyCode?: string | null;
  occurredAt: Date;
}

export interface ActivityEventRecord {
  id: string;
  groupId: string;
  userId: string;
  type: ActivityType;
  message: string;
  amountMinorUnits: bigint | null;
  currencyCode: string | null;
  occurredAt: Date;
  createdAt: Date;
  user: { id: string; name: string; email: string };
}

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

/**
 * Creates an activity event using the transaction client of the caller, so the
 * event is committed together with the domain record that produced it. A single
 * helper keeps the write shape consistent across the group, expense, and
 * settlement flows.
 */
export function createActivityEvent(
  tx: Prisma.TransactionClient,
  data: CreateActivityEventData,
): Promise<{ id: string }> {
  return tx.activityEvent
    .create({
      data: {
        groupId: data.groupId,
        userId: data.userId,
        type: data.type,
        message: data.message,
        amountMinorUnits: data.amountMinorUnits ?? null,
        currencyCode: data.currencyCode ?? null,
        occurredAt: data.occurredAt,
      },
      select: { id: true },
    })
    .then((event) => {
      // Only counts events that were actually persisted. `type` is the bounded
      // Prisma ActivityType enum, so this label dimension is small and stable.
      metrics.increment(METRIC.activityEventsCreatedTotal, {
        [METRIC_LABEL.activityType]: data.type,
      });
      return event;
    });
}

export class ActivityRepository {
  findGroupById(id: string): Promise<{ id: string; name: string; createdById: string } | null> {
    return prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdById: true,
      },
    });
  }

  isGroupMember(groupId: string, userId: string): Promise<boolean> {
    return prisma.groupMember
      .findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        select: {
          id: true,
        },
      })
      .then((member) => member !== null);
  }

  /**
   * Returns one page of the group's activity events with the actor's safe
   * public fields. The `where` filter, deterministic ordering, and pagination
   * are all applied at the database level.
   */
  async findActivityByGroupId(
    groupId: string,
    options: { page: number; limit: number },
  ): Promise<{ events: ActivityEventRecord[]; total: number }> {
    const [events, total] = await Promise.all([
      prisma.activityEvent.findMany({
        where: { groupId },
        select: {
          id: true,
          groupId: true,
          userId: true,
          type: true,
          message: true,
          amountMinorUnits: true,
          currencyCode: true,
          occurredAt: true,
          createdAt: true,
          user: { select: safeUserSelect },
        },
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.activityEvent.count({ where: { groupId } }),
    ]);

    return { events, total };
  }
}
