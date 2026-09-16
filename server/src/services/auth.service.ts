import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { eq, or } from 'drizzle-orm'
import { db } from '../db'
import { users, refreshTokens } from '../db/schema'
import { AppError } from '../utils/errors'
import { RegisterInput } from '../schemas/auth.schema'

export async function register({ username, email, password }: RegisterInput) {
  // 1. Check if email or username is already taken
  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }
    throw new AppError('An account with this username already exists.', 409, 'USERNAME_TAKEN');
  }

  // 2. Hash password (cost factor 12)
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Insert user into database
  const [newUser] = await db
    .insert(users)
    .values({
      username,
      email,
      passwordHash,
    })
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
    });

  // 4. Generate short-lived Access Token (15m)
  const jwtSecret = process.env.JWT_SECRET || 'codev-jwt-super-secret-key-replace-in-prod';
  const accessToken = jwt.sign(
    {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
    },
    jwtSecret,
    { expiresIn: '15m' }
  );

  // 5. Generate cryptographically secure Refresh Token (7d)
  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // 6. Save hashed refresh token to database
  await db.insert(refreshTokens).values({
    userId: newUser.id,
    tokenHash,
    expiresAt,
  });

  return {
    user: newUser,
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

