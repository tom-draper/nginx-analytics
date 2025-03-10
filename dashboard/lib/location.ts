import maxmind, { CityResponse, CountryResponse, Reader } from 'maxmind';

export type Location = {
    ipAddress: string;
    country: string;
    city: string;
}

let cityLookup: Reader<CityResponse> | undefined;
let countryLookup: Reader<CountryResponse> | undefined;
let initializationPromise: Promise<void> | null = null;

// Modified to return a promise that resolves when initialization is complete
function initializeLookups(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (initializationPromise) {
        return initializationPromise;
    }

    // Create a new initialization promise
    initializationPromise = (async () => {
        try {
            cityLookup = await maxmind.open<CityResponse>('GeoLite2-City.mmdb');
            return;
        } catch (error) {
            try {
                countryLookup = await maxmind.open<CountryResponse>('GeoLite2-Country.mmdb');
                console.log('Country database loaded');
            } catch (error) {
                console.error('Error loading country lookup', error);
                throw new Error('Failed to load both city and country databases');
            }
        }
    })();

    return initializationPromise;
}

export async function locationLookup(ipAddress: string) {
    await initializeLookups(); // Ensure DBs are initialized

    if (cityLookup) {
        const response = cityLookup.get(ipAddress);
        return {
            ipAddress,
            country: response?.country?.iso_code || null,
            city: response?.city?.names?.en || null,
        };
    } else if (countryLookup) {
        const response = countryLookup.get(ipAddress);
        return {
            ipAddress,
            country: response?.country?.iso_code || null,
            city: null,
        };
    } else {
        return {
            ipAddress,
            country: null,
            city: null,
        };
    }
}

export async function getLocations(ipAddresses: string[]) {
    return await Promise.all(ipAddresses.map(locationLookup));
}