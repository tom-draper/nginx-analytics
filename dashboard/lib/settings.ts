
export type Settings = {
    ignore404: boolean;
    ignoreParams: boolean;
    excludeBots: boolean;
}

export const newSettings = () => {
    const settings: Settings = {
        ignore404: false,
        ignoreParams: false,
        excludeBots: false,
    }
    return settings;
}
