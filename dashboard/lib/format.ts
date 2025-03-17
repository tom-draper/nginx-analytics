
export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) {
        return '0 Bytes';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))
    const unit = (value === 1 && sizes[i] === 'Bytes') ? 'Byte' : sizes[i];

    return `${value} ${unit}`
};
