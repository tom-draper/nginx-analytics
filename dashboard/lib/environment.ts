import { defaultNginxAccessDir, defaultNginxAccessPath, defaultNginxErrorDir, defaultNginxErrorPath } from "./consts";

export const nginxAccessDir = process.env.NGINX_ACCESS_DIR || defaultNginxAccessDir;

export const nginxErrorDir = process.env.NGINX_ERROR_DIR || process.env.NGINX_ACCESS_DIR || defaultNginxErrorDir;

export const nginxAccessPath = process.env.NGINX_ACCESS_PATH || defaultNginxAccessPath;

export const nginxErrorPath = process.env.NGINX_ERROR_PATH || defaultNginxErrorPath;

export const nginxAccessUrl = process.env.NGINX_ACCESS_URL;
export const nginxErrorUrl = process.env.NGINX_ERROR_URL;

export const authToken = process.env.NGINX_ANALYTICS_AUTH_TOKEN;

export const password = process.env.NGINX_ANALYTICS_PASSWORD;

export const systemMonitoringEnabled = process.env.NGINX_ANALYTICS_SYSTEM_MONITORING === 'true';

export const usingFileUpload = (
    !process.env.NGINX_ACCESS_DIR &&
    !process.env.NGINX_ERROR_DIR &&
    !process.env.NGINX_ACCESS_PATH &&
    !process.env.NGINX_ERROR_PATH &&
    !process.env.NGINX_ACCESS_URL &&
    !process.env.NGINX_ERROR_URL
);