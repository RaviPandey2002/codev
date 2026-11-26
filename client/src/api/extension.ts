import { api } from '@/lib/api';

export interface ExtensionInfoResponse {
  version: string;
  apiUrl: string;
  clientUrl: string;
  localCompanionUrl: string;
}

export function getExtensionDownloadUrl(): string {
  const base = (api.defaults.baseURL || 'http://localhost:3007').replace(/\/+$/, '');
  return `${base}/problems/extension/download`;
}

export async function getExtensionInfoApi(): Promise<ExtensionInfoResponse> {
  const res = await api.get<ExtensionInfoResponse>('/problems/extension/info');
  return res.data;
}
