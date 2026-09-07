import type { Request, Response } from "express";

import { HTTP_STATUSES } from "../../constants/http-statuses.js";
import { ActivityService } from "./activity.service.js";
import { ActivityRepository } from "./activity.repository.js";

const activityService = new ActivityService(new ActivityRepository());

export async function getGroupActivity(req: Request, res: Response): Promise<void> {
  const groupId = (req.params as { id: string }).id;
  const query = req.query as unknown as { page: number; limit: number };

  const feed = await activityService.getGroupActivity(req.userId!, groupId, {
    page: query.page,
    limit: query.limit,
  });

  res.status(HTTP_STATUSES.OK).json({
    success: true,
    data: { events: feed.events },
    pagination: feed.pagination,
  });
}
