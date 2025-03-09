import { Data } from "@/lib/types";
import { useEffect, useState } from "react";

type Location = {
    ipAddress: string;
    country: string;
    city: string;
}

export function Location({ data }: { data: Data }) {
    const [locations, setLocations] = useState<{ city: string, country: string, count: number }[] | null>(null);
    const [locationMap, setLocationMap] = useState<Map<string, Location>>(new Map());

    const fetchLocations = async (ipAddresses: string[]) => {
        const response = await fetch('/api/location', {
            method: 'POST',
            body: JSON.stringify({ ipAddresses })
        });
        if (!response.ok) {
            console.log('Failed to fetch locations');
            return [];
        }
        const data = await response.json();
        return data.locations;
    }

    const unknownLocations = (ipAddresses: string[]) => {
        return ipAddresses.filter((ip) => !locationMap.has(ip));
    }

    function getFlagEmoji(countryCode: string) {
        if (!countryCode) {
            return '';
        }

		const codePoints = countryCode
			.toUpperCase()
			.split('')
			.map((char) => 127397 + char.charCodeAt(undefined));
		return String.fromCodePoint(...codePoints);
	}

	function countryCodeToName(countryCode: string) {
        // get the country name from the country code
        if (!countryCode) {
            return '';
        }

        console.log('countryCode', countryCode);

        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        return regionNames.of(countryCode);
	}

    const updateLocationMap = (locations: Location[]) => {
        const newLocationMap = new Map(locationMap);
        locations.forEach((location) => {
            if (!newLocationMap.has(location.ipAddress)) {
                newLocationMap.set(location.ipAddress, location);
            }
        });
        setLocationMap(newLocationMap);
    }

    useEffect(() => {
        const fetchData = async () => {
            const ipAddresses = data.map((row) => row.ipAddress);
            const unknown = unknownLocations(ipAddresses)
            const locations = await fetchLocations(unknown);
            if (locations.length > 0) {
                updateLocationMap(locations);
            }
        };
        fetchData();
    }, [data]);

    useEffect(() => {
        const locationCount: { [location: string]: number } = {};
        for (const row of data) {
            const location = locationMap.get(row.ipAddress);
            if (!location || (!location.country && !location.city)) {
                continue;
            }

            if (!locationCount[location.country]) {
                locationCount[location.country] = 0;
            }
            locationCount[location.country] += 1;
        }

        const locations = Object.entries(locationCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([country, count]) => ({ country, count, city: '' })); setLocations(locations);
        setLocations(locations)
    }, [data, locationMap])

    return (
        <div className="border rounded-lg border-gray-300 flex-2 px-4 py-3 m-3">
            <h2 className="font-semibold">
                Location
            </h2>

            <div className="flex mt-1">
                {locations && locations.map((location) => (
                    <div key={location.country} className="flex-1">
                        <div className="flex-1 rounded h-36 mx-1 my-1 cursor-pointer grid" title={`${location.country}: ${location.count.toLocaleString()} requests`} onClick={() => {
                        }}>
                            <div className="bg-[var(--other-green)] rounded mt-auto" style={{height: `${(location.count / locations[0].count) * 100}%`}}></div>
                        </div>

                        <div className="flex flex-col text-center">
                            <div className="flex-1">
                                {getFlagEmoji(location.country)}
                            </div>
                        </div>
                    </div>
                ))}
                {locations && locations.length === 0 && (
                    <div className="flex-1">
                        <div className="flex-1 rounded h-36 mx-1 my-1 cursor-pointer grid place-items-center" title={`No locations found`}>
                            <div className="text-gray-400 pb-2">No locations found</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}