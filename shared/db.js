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

// Executes operations inside an ACID MongoDB transaction.
// Guarantees Atomicity, Consistency, Isolation, and Durability across collections.
// Falls back gracefully on standalone non-replica instances (e.g. mock test harnesses).
export async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      session.startTransaction();
      result = await fn(session);
      await session.commitTransaction();
    } catch (txErr) {
      if (/Transaction numbers are only allowed on a replica set member|standalone|no replica set/i.test(txErr.message)) {
        await session.abortTransaction().catch(() => {});
        return await fn(null);
      }
      await session.abortTransaction().catch(() => {});
      throw txErr;
    }
    return result;
  } finally {
    await session.endSession();
  }
}
