import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { Config } from './types.js';

/**
 * Read secret from file if available, otherwise return undefined
 */
function readSecretFromFile(filePath: string): string | undefined {
  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch {
    return undefined;
  }
}

const configSchema = z.object({
  ISEP_BASE_URL: z.string().default('https://portal.isep.ipp.pt'),
  ISEP_CODE_USER: z.string().optional(),
  ISEP_CODE_USER_CODE: z.string().optional(),
  ISEP_ENTIDADE: z.string().default('aluno'),
  ISEP_USERNAME: z.string().optional(),
  ISEP_PASSWORD: z.string().optional(),
  ISEP_USERNAME_FILE: z.string().optional(),
  ISEP_PASSWORD_FILE: z.string().optional(),
  ISEP_CODE_USER_FILE: z.string().optional(),
  ISEP_CODE_USER_CODE_FILE: z.string().optional(),
  ISEP_FETCH_WEEKS_BEFORE: z.coerce.number().default(0),
  ISEP_FETCH_WEEKS_AFTER: z.coerce.number().default(6),
  ISEP_REFRESH_MINUTES: z.coerce.number().default(15),
  TZ: z.string().default('Europe/Lisbon'),
  PORT: z.coerce.number().default(8080),
});

const env = configSchema.parse(process.env);

// Read secrets from files if available (for production with Docker secrets)
const usernameFromFile = env.ISEP_USERNAME_FILE
  ? readSecretFromFile(env.ISEP_USERNAME_FILE)
  : undefined;
const passwordFromFile = env.ISEP_PASSWORD_FILE
  ? readSecretFromFile(env.ISEP_PASSWORD_FILE)
  : undefined;
const codeUserFromFile = env.ISEP_CODE_USER_FILE
  ? readSecretFromFile(env.ISEP_CODE_USER_FILE)
  : undefined;
const codeUserCodeFromFile = env.ISEP_CODE_USER_CODE_FILE
  ? readSecretFromFile(env.ISEP_CODE_USER_CODE_FILE)
  : undefined;

export const config: Config = {
  baseUrl: env.ISEP_BASE_URL.replace(/\/$/, ''),
  // Use file secrets if available, otherwise fall back to environment variables
  codeUser: codeUserFromFile || env.ISEP_CODE_USER,
  codeUserCode: codeUserCodeFromFile || env.ISEP_CODE_USER_CODE,
  entidade: env.ISEP_ENTIDADE,
  username: usernameFromFile || env.ISEP_USERNAME,
  password: passwordFromFile || env.ISEP_PASSWORD,
  weeksBefore: env.ISEP_FETCH_WEEKS_BEFORE,
  weeksAfter: env.ISEP_FETCH_WEEKS_AFTER,
  refreshMinutes: env.ISEP_REFRESH_MINUTES,
  timezone: env.TZ,
  port: env.PORT,
};

export const API_URLS = {
  getCodeWeek: `${config.baseUrl}/intranet/ver_horario/ver_horario.aspx/getCodeWeekByData`,
  mudarSemana: `${config.baseUrl}/intranet/ver_horario/ver_horario.aspx/mudar_semana`,
} as const;
