import maxmind, { CityResponse, CountryResponse, Reader } from 'maxmind';

let cityLookup: Reader<CityResponse> | null = null;
(async () => {
    try {
        cityLookup = await maxmind.open<CityResponse>('GeoLite2-City.mmdb');
    } catch (error) {
        console.error('Error loading city lookup', error);
    }
})();

let countryLookup: Reader<CountryResponse> | null = null;
(async () => {
    try {
        countryLookup = await maxmind.open<CountryResponse>('GeoLite2-Country.mmdb');
    } catch (error) {
        console.error('Error loading country lookup', error);
    }
})();

export function locationLookup(ipAddress: string) {
    if (cityLookup) {
        const response = cityLookup.get(ipAddress);
        return {
            ipAddress,
            country: response?.country?.iso_code,
            city: response?.city?.names?.en,
        }
    } else if (countryLookup) {
        const response = countryLookup.get(ipAddress);
        return {
            ipAddress,
            country: response?.country?.iso_code,
            city: null
        }
    } else {
        return {
            ipAddress,
            country: null,
            city: null
        };
    }
}

export function getLocations(ipAddresses: string[]) {
    return ipAddresses.map(locationLookup);
}