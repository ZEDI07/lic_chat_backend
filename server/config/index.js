const PORT = process.env.PORT;
const DB_URL = process.env.DB_URL;
const SERVER_URL = process.env.SERVER_URL;
const CHAT_BACKEND = process.env.CHAT_BACKEND;
const CHAT_FRONTEND = process.env.CHAT_FRONTEND;
const EMPLOYEE_ENGAGEMENT = process.env.EMPLOYEE_ENGAGEMENT;
const DEBUG_LOG = false;
const RUN_CRON = process.env.RUN_CRON == true || process.env.RUN_CRON == "true";
// Redis Config
const REDIS_NAMESPACE = process.env.REDIS_NAMESPACE;
const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
//JWT Secret Key
const SECRET_KEY = process.env.SECRET_KEY;
// # Nodemailer Config
const NODEMAILER_HOST = process.env.NODEMAILER_HOST;
const NODEMAILER_PORT = process.env.NODEMAILER_PORT;
const NODEMAILER_USER = process.env.NODEMAILER_USER;
const NODEMAILER_PASS = process.env.NODEMAILER_PASS;
// S3 Credentials
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_REGION = process.env.S3_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_CDN_URL = process.env.S3_CDN_URL;

export {
  DB_URL,
  NODEMAILER_HOST,
  NODEMAILER_PASS,
  NODEMAILER_PORT,
  NODEMAILER_USER,
  PORT,
  REDIS_HOST,
  REDIS_URL,
  REDIS_NAMESPACE,
  REDIS_PASSWORD,
  REDIS_PORT,
  SECRET_KEY,
  SERVER_URL,
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,
  S3_REGION,
  S3_BUCKET,
  S3_CDN_URL,
  DEBUG_LOG,
  RUN_CRON,
  CHAT_BACKEND,
  CHAT_FRONTEND,
  EMPLOYEE_ENGAGEMENT,
};
