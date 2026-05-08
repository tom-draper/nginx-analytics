import { Dispatch, memo, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { type Location as LocationData } from '@/lib/location'
import { generateDemoLocations } from "../demo";


const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const Location = memo(function Location({
    unknownIPs,
    locationCounts,
    locationMap,
    setLocationMap,
    filterLocation,
    setFilterLocation,
    noFetch,
    demo,
}: {
    unknownIPs: string[];
    locationCounts: Record<string, number>;
    locationMap: Map<string, LocationData>;
    setLocationMap: Dispatch<SetStateAction<Map<string, LocationData>>>;
    filterLocation: string | null;
    setFilterLocation: (location: string | null) => void;
    noFetch: boolean;
    demo: boolean;
}) {
    const [endpointDisabled, setEndpointDisabled] = useState(false);
    const fetchedIPsRef = useRef(new Set<string>());

    const fetchLocations = async (ipAddresses: string[]) => {
        const response = await fetch('/api/location', {
            method: 'POST',
            body: JSON.stringify(ipAddresses)
        });

        if (!response.ok) {
            if (response.status === 403 || response.status === 404) {
                setEndpointDisabled(true);
                return [];
            }
            console.log('Failed to fetch locations');
            return [];
        }

        const data = await response.json();
        return data;
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
        if (noFetch || endpointDisabled || unknownIPs.length === 0) return;

        const newIPs = unknownIPs.filter(ip => !fetchedIPsRef.current.has(ip));
        if (newIPs.length === 0) return;
        newIPs.forEach(ip => fetchedIPsRef.current.add(ip));

        const fetchData = async () => {
            try {
                let fetchedLocations: LocationData[];
                if (demo) {
                    fetchedLocations = generateDemoLocations(newIPs);
                } else {
                    fetchedLocations = await fetchLocations(newIPs);
                }
                if (fetchedLocations.length > 0) {
                    setLocationMap((prevMap) => {
                        const newMap = new Map(prevMap);
                        let updated = false;
                        fetchedLocations.forEach((loc) => {
                            if (!newMap.has(loc.ipAddress)) {
                                newMap.set(loc.ipAddress, loc);
                                updated = true;
                            }
                        });
                        return updated ? newMap : prevMap;
                    });
                }
            } catch (err) {
                console.error('Error fetching locations:', err);
            }
        };

        fetchData();
    }, [unknownIPs, noFetch, demo, endpointDisabled]);

    const locations = useMemo(() => {
        return Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).map(([country, count]) => ({ country, count, city: '' }));
    }, [locationCounts]);

    return (
        <div className="card flex-2 px-4 py-3 m-3 relative min-h-53">
            <h2 className="font-semibold">
                Location
            </h2>

            <div className="flex h-40 mt-2">
                {locations && locations.slice(0, 12).map((location) => (
                    <div key={location.country} className="flex-1">
                        <div className="flex-1 rounded h-32 mx-1 my-1 cursor-pointer grid hover:bg-[var(--hover-background)]" title={`${countryCodeToName(location.country)}: ${location.count.toLocaleString()} requests`} onClick={() => { selectLocation(location.country) }}>
                            <div className="bg-[var(--highlight)] rounded mt-auto" style={{ height: `${(location.count / locations[0].count) * 100}%` }}></div>
                        </div>

                        <div className="flex flex-col text-center">
                            <div className="h-6 leading-6 overflow-hidden">
                                {getFlagEmoji(location.country)}
                            </div>
                        </div>
                    </div>
                ))}
                {locations.length > 0 && (
                    <div className="absolute top-4 right-6 text-sm text-[var(--text-muted3)]">
                        {locations.length} {locations.length === 1 ? 'location' : 'locations'}
                    </div>
                )}
                {locations.length === 0 && (
                    <div className="flex-1 rounded h-32 mx-1 my-1 grid place-items-center" title="No locations found">
                        <div className="text-[var(--text-muted3)]">No locations found</div>
                    </div>
                )}
            </div>
        </div >
    )
});
