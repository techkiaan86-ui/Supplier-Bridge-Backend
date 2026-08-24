import jwt, { SignOptions } from 'jsonwebtoken';

export const generateAccessToken = (userId: string, role: string) => {
  const options: SignOptions = { expiresIn: '1d' };
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET as string, options);
};

export const generateRefreshToken = (userId: string) => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET as string, options);
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as jwt.JwtPayload;
};
