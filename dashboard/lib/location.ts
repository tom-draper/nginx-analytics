import maxmind, { CityResponse, CountryResponse, Reader } from 'maxmind';

export type Location = {
    ipAddress: string;
    country: string;
    city: string;
    lat: number | null;
    lon: number | null;
}

let cityLookup: Reader<CityResponse> | undefined;
let countryLookup: Reader<CountryResponse> | undefined;
let initializationPromise: Promise<void> | null = null;
const LOOKUP_CONCURRENCY = 25;

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
            console.log('GeoLite2 City database loaded successfully');
            return;
        } catch {
            try {
                countryLookup = await maxmind.open<CountryResponse>('GeoLite2-Country.mmdb');
                console.log('GeoLite2 Country database loaded successfully');
            } catch (error) {
                console.log('Failed to load both GeoLite2 City and Country databases', error);
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
            country: response?.country?.iso_code || '',
            city: response?.city?.names?.en || '',
            lat: response?.location?.latitude ?? null,
            lon: response?.location?.longitude ?? null,
        };
    } else if (countryLookup) {
        const response = countryLookup.get(ipAddress);
        return {
            ipAddress,
            country: response?.country?.iso_code || '',
            city: '',
            lat: null,
            lon: null,
        };
    } else {
        return {
            ipAddress,
            country: '',
            city: '',
            lat: null,
            lon: null,
        };
    }
}

export async function getLocations(ipAddresses: string[]) {
    const locations: Location[] = new Array(ipAddresses.length);
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < ipAddresses.length) {
            const index = nextIndex++;
            locations[index] = await locationLookup(ipAddresses[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(LOOKUP_CONCURRENCY, ipAddresses.length) }, worker));
    return locations;
}
