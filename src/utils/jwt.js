import jwt from 'jsonwebtoken';

export const signToken = (userId, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn });
};