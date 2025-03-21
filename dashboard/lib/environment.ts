export const nginxAccessDir = process.env.NGINX_ANALYTICS_ACCESS_DIR;

export const nginxErrorDir = process.env.NGINX_ANALYTICS_ERROR_DIR;

export const nginxAccessPath = process.env.NGINX_ANALYTICS_ACCESS_PATH;

export const nginxErrorPath = process.env.NGINX_ANALYTICS_ERROR_PATH;

export const agentUrl = process.env.NGINX_ANALYTICS_AGENT_URL;

export const authToken = process.env.NGINX_ANALYTICS_AUTH_TOKEN;

export const password = process.env.NGINX_ANALYTICS_PASSWORD;

export const systemMonitoringEnabled = process.env.NGINX_ANALYTICS_SYSTEM_MONITORING === 'true';

export const usingFileUpload = (
    !process.env.NGINX_ANALYTICS_AGENT_URL &&
    !process.env.NGINX_ANALYTICS_ACCESS_DIR &&
    !process.env.NGINX_ANALYTICS_ERROR_DIR &&
    !process.env.NGINX_ANALYTICS_ACCESS_PATH &&
    !process.env.NGINX_ANALYTICS_ERROR_PATH
);