import { api } from '@/lib/api';
import type {
  RoomDTO,
  RoomFileDTO,
  CreateRoomInput,
  RoomRole,
  RoomMemberDTO,
  InviteMemberInput,
} from '@codev/shared';

export interface RoomDetailsResponse {
  room: RoomDTO;
  files: RoomFileDTO[];
  userRole: RoomRole | null;
}

export interface RoomMembersResponse {
  owner: { userId: string; username: string; email: string };
  members: RoomMemberDTO[];
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

export async function deleteOrLeaveRoomApi(
  roomId: string
): Promise<{ ok: boolean; deleted: boolean; left: boolean }> {
  const res = await api.delete<{ ok: boolean; deleted: boolean; left: boolean }>(`/rooms/${roomId}`);
  return res.data;
}

export async function listRoomMembersApi(roomId: string): Promise<RoomMembersResponse> {
  const res = await api.get<RoomMembersResponse>(`/rooms/${roomId}/members`);
  return res.data;
}

export async function inviteRoomMemberApi(
  roomId: string,
  data: InviteMemberInput
): Promise<RoomMemberDTO> {
  const res = await api.post<{ member: RoomMemberDTO }>(`/rooms/${roomId}/members`, data);
  return res.data.member;
}

export async function removeRoomMemberApi(
  roomId: string,
  userId: string
): Promise<{ ok: boolean; removed: boolean }> {
  const res = await api.delete<{ ok: boolean; removed: boolean }>(`/rooms/${roomId}/members/${userId}`);
  return res.data;
}

