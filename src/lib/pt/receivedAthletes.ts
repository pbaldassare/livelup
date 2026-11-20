export type ReceivedAthleteLike = {
  atleta_user_id: string;
  completed_at: string | null;
};

export type RecallStamp = {
  atleta_user_id: string;
  completed_at: string | null;
};

function stampMs(iso: string | null | undefined) {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

/** Keep the latest inbound transfer per athlete unless a later recall exists. */
export function filterReceivedAthletesStillCeded<T extends ReceivedAthleteLike>(
  inbound: T[],
  recalls: RecallStamp[],
): T[] {
  const latestRecall = new Map<string, number>();
  for (const row of recalls) {
    const t = stampMs(row.completed_at);
    const prev = latestRecall.get(row.atleta_user_id) ?? -1;
    if (t >= prev) latestRecall.set(row.atleta_user_id, t);
  }

  const latestInbound = new Map<string, T>();
  for (const row of inbound) {
    const existing = latestInbound.get(row.atleta_user_id);
    if (!existing || stampMs(row.completed_at) >= stampMs(existing.completed_at)) {
      latestInbound.set(row.atleta_user_id, row);
    }
  }

  return Array.from(latestInbound.values()).filter((row) => {
    const recallAt = latestRecall.get(row.atleta_user_id);
    if (recallAt == null) return true;
    return recallAt < stampMs(row.completed_at);
  });
}
