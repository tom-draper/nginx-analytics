
export type Settings = {
    ignore404: boolean;
    ignoreParams: boolean;
}

export const newSettings = () => {
    const settings: Settings = {
        ignore404: false,
        ignoreParams: false
    }
    return settings;
}