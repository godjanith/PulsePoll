import mongoose from 'mongoose';
import { setMongoStorageEnabled } from '../repositories/pollRepository.js';

/** MongoDB is optional: the app stays usable with its local JSON store when no URI is configured. */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    setMongoStorageEnabled(false);
    console.log('[Database] MONGO_URI is not set. Using the local JSON store.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, { autoIndex: true, serverSelectionTimeoutMS: 4000 });
    setMongoStorageEnabled(true);
    console.log(`[Database] MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name}).`);
    mongoose.connection.on('error', (error) => console.error('[Database] Runtime connection error:', error.message));
    mongoose.connection.on('disconnected', () => console.warn('[Database] MongoDB disconnected. The server will not silently switch data stores during this run.'));
    return true;
  } catch (error) {
    setMongoStorageEnabled(false);
    console.warn(`[Database] MongoDB is unavailable: ${error.message}`);
    console.warn('[Database] Continuing with local JSON storage. Configure MONGO_URI to use MongoDB.');
    return false;
  }
};
