export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://scholar:scholar_dev@localhost:5432/scholarcli'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'scholar-cli-jwt-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'scholar-cli-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  bootstrapAdmin: {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || '',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || '',
    name: process.env.BOOTSTRAP_ADMIN_NAME || 'Admin'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.ANTHROPIC_BASE_URL || ''
  },
  s3: {
    enabled: process.env.S3_ENABLED === 'true',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'scholarcli',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false'
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`
  }
};
