import { registerAs } from '@nestjs/config';

export const app = registerAs('APP', () => ({
  DATABASE_URL: process.env['DATABASE_URL'],
  PORT: process.env['PORT'],
  JWT_SECRET: process.env['JWT_SECRET'],
  CLIENT_URL: process.env['CLIENT_URL'],
  APP_URL: process.env['APP_URL'],
}));

export const aiServices = registerAs('AI_SERVICE', () => ({
  TWELVE_LABS_API_KEY: process.env['TL_API_KEY'],
  TWELVE_LABS_BASE_URL: process.env['TWELVE_LABS_BASE_URL'],
  TWELVE_LABS_SIGNING_SECRET: process.env['TWELVE_LABS_SIGNING_SECRET'],
  OPEN_AI_API_KEY: process.env['OPEN_AI_API_KEY'],
  PERPLEXITY_API_KEY: process.env['PERPLEXITY_API_KEY'],
}));

export const cloudServices = registerAs('SERVICE', () => ({
  REDIS_HOST: process.env['REDIS_HOST'],
  REDIS_PORT: process.env['REDIS_PORT'],
  REDIS_PASSWORD: process.env['REDIS_PASSWORD'],
}));

export const gmailServices = registerAs('GMAIL', () => ({
  GMAIL_MAIL: process.env['GMAIL_MAIL'],
  GMAIL_PASS: process.env['GMAIL_PASS'],
}));

export const awsServices = registerAs('AWS', () => ({
  AWS_SECRET_ACCESS_KEY: process.env['AWS_SECRET_ACCESS_KEY'],
  AWS_ACCESS_KEY_ID: process.env['AWS_ACCESS_KEY_ID'],
  AWS_CLOUDFRONT_DISTRIBUTION: process.env['AWS_CLOUDFRONT_DISTRIBUTION'],
  AWS_BUCKET_NAME: process.env['AWS_CLOUDFRONT_DISTRIBUTION'],
  AWS_REGION: process.env['AWS_CLOUDFRONT_DISTRIBUTION'],
}));
