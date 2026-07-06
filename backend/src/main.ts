import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express = require('express');

// Express server instance for Vercel Serverless
const server = express();

let nestAppPromise: Promise<any>;

async function bootstrapServerless() {
  if (!nestAppPromise) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    app.enableCors();
    await app.init();
    nestAppPromise = Promise.resolve(app);
  }
  return server;
}

// Local development bootstrapping
if (process.env.NODE_ENV !== 'production') {
  async function bootstrapLocal() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`SI-TAQUA Backend running locally on port ${port}`);
  }
  bootstrapLocal();
}

// Export the serverless handler
export default async (req: any, res: any) => {
  const handler = await bootstrapServerless();
  return handler(req, res);
};
