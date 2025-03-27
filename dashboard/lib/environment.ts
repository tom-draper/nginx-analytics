export const nginxAccessPath = process.env.NGINX_ANALYTICS_ACCESS_PATH;

export const nginxErrorPath = process.env.NGINX_ANALYTICS_ERROR_PATH;

export const serverUrl = process.env.NGINX_ANALYTICS_SERVER_URL;

export const authToken = process.env.NGINX_ANALYTICS_AUTH_TOKEN;

export const password = process.env.NGINX_ANALYTICS_PASSWORD;

export const systemMonitoringEnabled = process.env.NGINX_ANALYTICS_SYSTEM_MONITORING === 'true';

export const usingFileUpload = (
    !serverUrl &&
    !nginxAccessPath &&
    !nginxErrorPath
);