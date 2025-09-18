import { z } from 'zod';
import { Config } from './types.js';

const configSchema = z.object({
  ISEP_BASE_URL: z.string().default('https://portal.isep.ipp.pt'),
  ISEP_CODE_USER: z.string().default('YOUR_STUDENT_CODE'),
  ISEP_CODE_USER_CODE: z.string().default('YOUR_STUDENT_CODE'),
  ISEP_ENTIDADE: z.string().default('aluno'),
  ISEP_USERNAME: z.string().optional(),
  ISEP_PASSWORD: z.string().optional(),
  ISEP_FETCH_WEEKS_BEFORE: z.coerce.number().default(0),
  ISEP_FETCH_WEEKS_AFTER: z.coerce.number().default(6),
  ISEP_REFRESH_MINUTES: z.coerce.number().default(15),
  TZ: z.string().default('Europe/Lisbon'),
  PORT: z.coerce.number().default(8080),
});

const env = configSchema.parse(process.env);

export const config: Config = {
  baseUrl: env.ISEP_BASE_URL.replace(/\/$/, ''),
  codeUser: env.ISEP_CODE_USER,
  codeUserCode: env.ISEP_CODE_USER_CODE,
  entidade: env.ISEP_ENTIDADE,
  username: env.ISEP_USERNAME,
  password: env.ISEP_PASSWORD,
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
