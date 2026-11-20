import { api } from '@/lib/api';
import type { ImportProblemInput, ProblemData } from '@codev/shared';

export async function importProblemApi(data: ImportProblemInput): Promise<ProblemData> {
  const res = await api.post<{ problem: ProblemData }>('/problems/import', data);
  return res.data.problem;
}
