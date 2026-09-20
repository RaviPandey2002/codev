import { api } from '@/lib/api';
import type { RoomDTO, RoomFileDTO, CreateRoomInput, RoomRole } from '@codev/shared';

export interface RoomDetailsResponse {
  room: RoomDTO;
  files: RoomFileDTO[];
  userRole: RoomRole | null;
}

export async function createRoomApi(data: CreateRoomInput): Promise<RoomDTO> {
  const res = await api.post<{ room: RoomDTO }>('/rooms', data);
  return res.data.room;
}

export async function listRoomsApi(): Promise<RoomDTO[]> {
  const res = await api.get<{ rooms: RoomDTO[] }>('/rooms');
  return res.data.rooms;
}

export async function getRoomDetailsApi(roomId: string): Promise<RoomDetailsResponse> {
  const res = await api.get<RoomDetailsResponse>(`/rooms/${roomId}`);
  return res.data;
}

export async function joinRoomApi(roomId: string): Promise<RoomDTO> {
  const res = await api.post<{ room: RoomDTO }>(`/rooms/${roomId}/join`);
  return res.data.room;
}

