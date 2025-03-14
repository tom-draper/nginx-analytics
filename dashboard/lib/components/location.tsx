import { NginxLog } from "@/lib/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { type Location } from '@/lib/location'


export function Location({ data, locationMap, setLocationMap, filterLocation, setFilterLocation }: { data: NginxLog[], locationMap: Map<string, Location>, setLocationMap: Dispatch<SetStateAction<Map<string, Location>>>, filterLocation: string | null, setFilterLocation: (location: string | null) => void }) {
    const [locations, setLocations] = useState<{ city: string, country: string, count: number }[] | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchLocations = async (ipAddresses: string[]) => {
        const response = await fetch('/api/location', {
            method: 'POST',
            body: JSON.stringify({ ipAddresses })
        });

        if (!response.ok) {
            console.log('Failed to fetch locations');
            setLoading(false);
            return [];
        }
        const data = await response.json();
        console.log(data);
        return data.locations;
    }

    function getFlagEmoji(countryCode: string) {
        if (!countryCode) {
            return '';
        }

        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map((char) => 127397 + char.charCodeAt(undefined as any));
        return String.fromCodePoint(...codePoints);
    }

    function countryCodeToName(countryCode: string) {
        if (!countryCode) {
            return '';
        }

        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        return regionNames.of(countryCode);
    }

    const selectLocation = (location: string) => {
        if (filterLocation === location) {
            setFilterLocation(null);
        } else {
            setFilterLocation(location)
        }
    }

    useEffect(() => {
        const updateLocationMap = (locations: Location[]) => {
            setLocationMap((prevMap) => {
                const newLocationMap = new Map(prevMap);
                let updated = false;

                locations.forEach((location) => {
                    if (!newLocationMap.has(location.ipAddress)) {
                        newLocationMap.set(location.ipAddress, location);
                        updated = true;
                    }
                });

                return updated ? newLocationMap : prevMap;
            });
        };

        const fetchData = async () => {
            const ipAddresses = data.map((row) => row.ipAddress);
            const unknown = ipAddresses.filter((ip) => !locationMap.has(ip));

            if (unknown.length > 0) {
                setLoading(true);
                try {
                    const locations = await fetchLocations(unknown);
                    if (locations.length > 0) {
                        updateLocationMap(locations);
                    }
                } catch (error) {
                    console.error("Error fetching locations:", error);
                }
                setLoading(false);
            }
        };

        fetchData();
    }, [data, locationMap, setLocationMap]);

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

        const locations = Object.entries(locationCount).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count, city: '' })); setLocations(locations);
        setLocations(locations)
    }, [data, locationMap])

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative">
            <h2 className="font-semibold">
                Location
            </h2>

            <div className="flex mt-2">
                {locations && locations.slice(0, 12).map((location) => (
                    <div key={location.country} className="flex-1">
                        <div className="flex-1 rounded h-32 mx-1 my-1 cursor-pointer grid hover:bg-[var(--hover-background)]" title={`${countryCodeToName(location.country)}: ${location.count.toLocaleString()} requests`} onClick={() => { selectLocation(location.country) }}>
                            <div className="bg-[var(--highlight)] rounded mt-auto" style={{ height: `${(location.count / locations[0].count) * 100}%` }}></div>
                        </div>

                        <div className="flex flex-col text-center">
                            <div className="flex-1">
                                {getFlagEmoji(location.country)}
                            </div>
                        </div>
                    </div>
                ))}
                {locations !== null && locations.length > 0 && (
                    <div className="absolute top-4 right-6 text-sm text-[var(--text-muted3)]">
                        {locations.length} {locations.length === 1 ? 'location' : 'locations'}
                    </div>
                )}
                {locations !== null && locations.length === 0 && (
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex-1 rounded h-32 mx-1 my-1 grid place-items-center">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <div className="flex-1 rounded h-36 mx-1 my-1 grid place-items-center" title={`No locations found`}>
                                <div className="text-[var(--text-muted3)] pb-2">No locations found</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    )
}