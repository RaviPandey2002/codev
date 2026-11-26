import { api } from '@/lib/api';
import type { ImportProblemInput, ProblemData } from '@codev/shared';

export async function importProblemApi(data: ImportProblemInput): Promise<ProblemData> {
  const res = await api.post<{ problem: ProblemData }>('/problems/import', data);
  return res.data.problem;
}

export async function getLatestCompanionProblemApi(
  since?: number,
  roomId?: string
): Promise<{ problem: ProblemData; timestamp: number } | null> {
  const res = await api.get<{ latest: { problem: ProblemData; timestamp: number } | null }>(
    '/problems/companion/latest',
    { params: { since, roomId } }
  );
  return res.data.latest;
}
