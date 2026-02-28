import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, "../../.env") });

interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  logLevel: string;
  appName: string;
}

class Config {
  private config: EnvironmentConfig;

  constructor() {
    this.config = {
      port: this.getNumber("PORT", 3000),
      nodeEnv: this.getString("NODE_ENV", "development"),
      mongoUri: this.getString(
        "MONGO_URI",
        "mongodb://localhost:27017/test_db"
      ),
      logLevel: this.getString("LOG_LEVEL", "info"),
      appName: this.getString("APP_NAME", "API"),
    };

    this.validate();
  }

  private getString(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private getNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number`);
    }
    return parsed;
  }

  private validate(): void {
    if (!this.config.mongoUri) {
      throw new Error("MONGO_URI is required");
    }

    if (this.config.port < 1 || this.config.port > 65535) {
      throw new Error("PORT must be between 1 and 65535");
    }

    const validEnvs = ["development", "production", "test"];
    if (!validEnvs.includes(this.config.nodeEnv)) {
      console.warn(
        `Warning: NODE_ENV should be one of: ${validEnvs.join(", ")}`
      );
    }
  }

  get(): EnvironmentConfig {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === "development";
  }

  isProduction(): boolean {
    return this.config.nodeEnv === "production";
  }

  isTest(): boolean {
    return this.config.nodeEnv === "test";
  }
}

export default new Config();
