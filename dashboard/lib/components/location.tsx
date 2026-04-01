import { NginxLog } from "@/lib/types";
import { Dispatch, memo, SetStateAction, useEffect, useMemo, useState } from "react";
import { type Location as LocationData } from '@/lib/location'
import { generateDemoLocations } from "../demo";


const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const Location = memo(function Location({
    data,
    locationCounts,
    locationMap,
    setLocationMap,
    filterLocation,
    setFilterLocation,
    noFetch,
    demo,
}: {
    data: NginxLog[];
    locationCounts: Record<string, number>;
    locationMap: Map<string, LocationData>;
    setLocationMap: Dispatch<SetStateAction<Map<string, LocationData>>>;
    filterLocation: string | null;
    setFilterLocation: (location: string | null) => void;
    noFetch: boolean;
    demo: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const [endpointDisabled, setEndpointDisabled] = useState(false);

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
            setLoading(false);
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

    // Derive unknown IPs from data and locationMap
    const unknownIPs = useMemo(() => {
        const seen = new Set<string>();
        const unknown: string[] = [];
        for (const row of data) {
            const ip = row.ipAddress;
            if (!ip || seen.has(ip)) continue;
            seen.add(ip);
            if (!locationMap.has(ip)) {
                unknown.push(ip);
            }
        }
        return unknown;
    }, [data, locationMap]);

    useEffect(() => {
        if (noFetch || endpointDisabled || unknownIPs.length === 0) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                let fetchedLocations: LocationData[];
                if (demo) {
                    fetchedLocations = generateDemoLocations(unknownIPs);
                } else {
                    fetchedLocations = await fetchLocations(unknownIPs);
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
            setLoading(false);
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
                {locations.length > 0 && (
                    <div className="absolute top-4 right-6 text-sm text-[var(--text-muted3)]">
                        {locations.length} {locations.length === 1 ? 'location' : 'locations'}
                    </div>
                )}
                {locations.length === 0 && (
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex-1 rounded h-32 mx-1 my-1 grid place-items-center">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <div className="flex-1 rounded h-32 mx-1 my-1 grid place-items-center" title={`No locations found`}>
                                <div className="text-[var(--text-muted3)]">No locations found</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    )
});
