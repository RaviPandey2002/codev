import crypto from 'crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a human-friendly, collision-resistant room code (e.g. "k4m9-2x7w")
 * Length: 9 characters (4 + '-' + 4)
 */
export function generateRoomId(): string {
  const bytes = crypto.randomBytes(8);
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

