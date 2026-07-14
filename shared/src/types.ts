// WebSocket message shapes — used by both client and server

export type WSMessage =
  | { type: 'yjs-update'; payload: number[] }
  | { type: 'chat-message'; userId: string; username: string; text: string; timestamp: number }
  | { type: 'room-error'; code: 'NOT_FOUND' | 'UNAUTHORIZED' }

// Room
export type RoomDTO = {
  id: string
  name: string
  createdAt: string
}

// User
export type UserDTO = {
  id: string
  username: string
  email: string
}
