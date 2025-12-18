export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  github: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  session: {
    secret: string;
  };
  openai: {
    apiKey: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || '',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-secret',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
};
