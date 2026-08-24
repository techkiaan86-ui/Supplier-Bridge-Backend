import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supplybridge_super_secret_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supplybridge_super_secret_refresh_jwt_key_2026';

export const generateAccessToken = (userId: string, role: string) => {
  const options: SignOptions = { expiresIn: '1d' };
  return jwt.sign({ id: userId, role }, JWT_SECRET, options);
};

export const generateRefreshToken = (userId: string) => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as jwt.JwtPayload;
};
