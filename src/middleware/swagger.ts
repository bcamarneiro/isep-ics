import { swaggerUI } from '@hono/swagger-ui';
import { API_ENDPOINTS, SWAGGER_THEME } from '../constants/index.js';

/**
 * Swagger UI middleware configuration
 */
export const swaggerMiddleware = swaggerUI({
  url: API_ENDPOINTS.OPENAPI,
  config: {
    deepLinking: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: Request) => {
      return req;
    },
    responseInterceptor: (res: Response) => {
      return res;
    },
    layout: SWAGGER_THEME.LAYOUT,
    plugins: [
      {
        statePlugins: {
          spec: {
            wrapSelectors: {
              allowTryItOutFor: () => () => true,
            },
          },
        },
      },
    ],
    // Dark theme configuration
    theme: SWAGGER_THEME.DARK,
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui { background-color: #1a1a1a; color: #ffffff; }
      .swagger-ui .info { background-color: #2d2d2d; }
      .swagger-ui .scheme-container { background-color: #2d2d2d; }
      .swagger-ui .opblock { background-color: #2d2d2d; border-color: #404040; }
      .swagger-ui .opblock .opblock-summary { border-color: #404040; }
      .swagger-ui .opblock.opblock-get { border-color: #61affe; background-color: rgba(97, 175, 254, 0.1); }
      .swagger-ui .opblock.opblock-post { border-color: #49cc90; background-color: rgba(73, 204, 144, 0.1); }
      .swagger-ui .opblock.opblock-put { border-color: #fca130; background-color: rgba(252, 161, 48, 0.1); }
      .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; background-color: rgba(249, 62, 62, 0.1); }
      .swagger-ui .btn { background-color: #404040; border-color: #404040; color: #ffffff; }
      .swagger-ui .btn:hover { background-color: #505050; border-color: #505050; }
      .swagger-ui .btn.execute { background-color: #4990e2; border-color: #4990e2; }
      .swagger-ui .btn.execute:hover { background-color: #357abd; border-color: #357abd; }
      .swagger-ui .parameter__name { color: #ffffff; }
      .swagger-ui .parameter__type { color: #61affe; }
      .swagger-ui .response-col_status { color: #ffffff; }
      .swagger-ui .response-col_description__inner { color: #ffffff; }
      .swagger-ui .model { color: #ffffff; }
      .swagger-ui .model-title { color: #ffffff; }
      .swagger-ui .prop-name { color: #ffffff; }
      .swagger-ui .prop-type { color: #61affe; }
      .swagger-ui .prop-format { color: #61affe; }
      .swagger-ui .table thead tr th, .swagger-ui .table tbody tr td { border-color: #404040; color: #ffffff; }
      .swagger-ui .highlight-code { background-color: #2d2d2d; }
      .swagger-ui .microlight { background-color: #2d2d2d; color: #ffffff; }
      .swagger-ui .highlight-code .microlight { background-color: #2d2d2d; color: #ffffff; }
    `,
  },
});
