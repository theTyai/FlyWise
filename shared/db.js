import mongoose from 'mongoose';

export { mongoose };

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

export function isValidId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && id.length === 24;
}
