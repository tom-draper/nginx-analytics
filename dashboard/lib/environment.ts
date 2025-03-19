
export const getPassword = () => {
    return process.env.NGINX_ANALYTICS_PASSWORD;
}

export const usingFileUpload = () => {
    return (
        !process.env.NGINX_ACCESS_DIR && 
        !process.env.NGINX_ERROR_DIR && 
        !process.env.NGINX_ACCESS_PATH && 
        !process.env.NGINX_ERROR_PATH && 
        !process.env.NGINX_ACCESS_URL && 
        !process.env.NGINX_ERROR_URL
    );
}