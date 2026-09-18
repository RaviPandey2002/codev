import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { eq, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { users, refreshTokens } from '../db/schema'
import { AppError } from '../utils/errors'
import { LoginInput, RegisterInput } from '../schemas/auth.schema'


const DUMMY_HASH = '$2a$12$e8rG.HjK5aZqU1L7mP3sYeN8bV0wX9cT4dF6gH2jK1lM5nP7qR9tS';

export async function register({ username, email, password }: RegisterInput) {
  // 1. Check if email or username is already taken
  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.email, email),
      sql`lower(${users.username}) = lower(${username})`),
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

export async function login({ email, password }: LoginInput) {

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });

  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;

  const isPasswordValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const jwtSecret = process.env.JWT_SECRET || 'codev-jwt-super-secret-key-replace-in-prod';
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
    },
    jwtSecret,
    { expiresIn: '15m' }
  );

  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt
  });

  return ({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    },
    accessToken,
    refreshToken: rawRefreshToken,
  })
}

export async function refresh(rawRefreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const storedToken = await db.query.refreshTokens.findFirst({ where: eq(refreshTokens.tokenHash, tokenHash) });

  if (!storedToken) {
    throw new AppError('Session expired. Please log in again.', 401, 'REFRESH_TOKEN_INVALID');
  }

  if (storedToken.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

    throw new AppError('Session expired. Please log in again.', 401, 'REFRESH_TOKEN_INVALID');
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, storedToken.userId) });

  if (!user) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

    throw new AppError('Session expired. Please log in again.', 401, 'REFRESH_TOKEN_INVALID');
  }

  const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
  const newTokenHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    await tx.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
    });
  });

  const jwtSecret = process.env.JWT_SECRET || 'codev-jwt-super-secret-key-replace-in-prod';

  const accessToken = jwt.sign({
    userId: user.id,
    email: user.email,
    username: user.username,
  },
    jwtSecret,
    {
      expiresIn: '15m'
    }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken: newRawRefreshToken,
  };

}

export async function logout(rawRefreshToken?: string) {
  if (!rawRefreshToken) return;
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));

}