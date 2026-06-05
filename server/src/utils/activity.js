import { ActivityLog } from "../models/ActivityLog.js";

export async function logActivity({
  teamId = null,
  entityType,
  entityId = null,
  action,
  message,
  meta = {},
  performedBy,
}) {
  return ActivityLog.create({
    teamId,
    entityType,
    entityId,
    action,
    message,
    meta,
    performedBy,
  });
}

