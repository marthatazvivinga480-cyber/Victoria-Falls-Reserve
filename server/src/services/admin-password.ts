import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User, Refresh } from '../models.js';
export async function setAdminPassword(email: string, password: string) {
  const input = z.string().min(16).max(72).parse(password);
  const hashed = await bcrypt.hash(input, 12);
  await mongoose.connection.transaction(async (session) => {
    const user = await User.findOneAndUpdate(
      { email, role: 'Admin' },
      { $set: { password: hashed }, $inc: { tokenVersion: 1 } },
      { new: true, session },
    );
    if (!user) throw new Error('Admin account not found; run the seed first');
    await Refresh.deleteMany({ user: user._id }, { session });
  });
}
