import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongo(params: { databaseUrl: string }) {
  if (isConnected) return;
  await mongoose.connect(params.databaseUrl, {
    autoIndex: true
  });
  isConnected = true;
}

export async function disconnectMongo() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

