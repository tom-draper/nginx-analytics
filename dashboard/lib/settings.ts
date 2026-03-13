
export type Settings = {
    ignore404: boolean;
    ignoreParams: boolean;
    excludeBots: boolean;
    excludedEndpoints: string[];
}

export const newSettings = () => {
    const settings: Settings = {
        ignore404: false,
        ignoreParams: false,
        excludeBots: false,
        excludedEndpoints: [],
    }
    return settings;
}
