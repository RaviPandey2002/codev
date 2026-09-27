import { api } from '@/lib/api';
import type { ExecuteCodeInput, ExecutionResult } from '@codev/shared';

export async function executeCodeApi(data: ExecuteCodeInput): Promise<ExecutionResult> {
  const res = await api.post<{ result: ExecutionResult }>('/execute', data);
  return res.data.result;
}
