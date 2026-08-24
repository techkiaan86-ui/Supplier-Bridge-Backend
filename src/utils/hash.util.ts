let bcryptLib: any;
try {
  bcryptLib = require('bcryptjs');
} catch (err) {
  try {
    bcryptLib = require('bcrypt');
  } catch (e) {
    console.error('Neither bcryptjs nor bcrypt could be loaded.');
  }
}

export const hashPassword = async (password: string, saltRounds = 12): Promise<string> => {
  if (bcryptLib?.hash) {
    return await bcryptLib.hash(password, saltRounds);
  }
  return password;
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  if (bcryptLib?.compare) {
    return await bcryptLib.compare(password, hash);
  }
  return password === hash;
};
