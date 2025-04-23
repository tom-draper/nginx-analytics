"use client";

import { NginxLog } from "@/lib/types";
import 'chartjs-adapter-date-fns';
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Location } from "@/lib/location"
import { clientErrorStatus, redirectStatus, serverErrorStatus, successStatus } from "../status";

// Dynamically import the Globe component with ssr disabled
const Globe = dynamic(
    () => import('react-globe.gl'),
    { ssr: false } // This prevents the component from being rendered on the server
);

// Constants for globe configuration
const GLOBE_HEIGHT = 600;

export default function LiveView({ data, locationMap }: { data: NginxLog[], locationMap: Map<string, Location> }) {
    const globeEl = useRef<any>(null);
    const [showGlobe, setShowGlobe] = useState(false);
    const [ringsData, setRingsData] = useState<any[]>([]);
    const [pointsData, setPointsData] = useState<any[]>([]);
    const previousDataRef = useRef<NginxLog[]>([]);
    const [hasLocations, setHasLocations] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Queue for logs with IP addresses not yet in locationMap
    const pendingLogsQueue = useRef<{ log: NginxLog, delay: number }[]>([]);

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };

        // Initial width calculation
        updateWidth();

        // Add resize listener
        window.addEventListener('resize', updateWidth);

        return () => {
            window.removeEventListener('resize', updateWidth);
        };
    }, []);

    // Check if any locations are available
    useEffect(() => {
        if (!locationMap) {
            return;
        }

        const hasAnyLocations = Array.from(locationMap.values()).some(location =>
            location &&
            typeof location.latitude === 'number' &&
            typeof location.longitude === 'number' &&
            !isNaN(location.latitude) &&
            !isNaN(location.longitude)
        );
        setHasLocations(hasAnyLocations);
    }, [locationMap]);

    // Initialize globe
    useEffect(() => {
        if (globeEl.current) {
            // Set initial globe parameters
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;

            // Give it a slight tilt
            globeEl.current.pointOfView({ lat: 25, lng: 0, altitude: 2.5 });
        }
    }, [showGlobe]);

    function getPointColor(status: number) {
        if (successStatus(status)) {
            return { pointColor: '#1af073', ringColor: '#1af073' };
        } else if (redirectStatus(status)) {
            return { pointColor: '#00bfff', ringColor: '#00bfff' };
        } else if (clientErrorStatus(status)) {
            return { pointColor: '#ff644b', ringColor: '#ff644b' };
        } else if (serverErrorStatus(status)) {
            return { pointColor: '#ff5050', ringColor: '#ff5050' };
        }
        return { pointColor: 'white', ringColor: 'white' };
    }

    // Function to add a request to the globe
    const addRequestToGlobe = useCallback((log: NginxLog) => {
        if (!locationMap.has(log.ipAddress)) {
            return;
        }

        const location = locationMap.get(log.ipAddress);
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return;
        }

        // Ensure coordinates are valid numbers
        if (isNaN(location.latitude) || isNaN(location.longitude)) {
            console.warn("Invalid coordinates for IP:", log.ipAddress);
            return;
        }

        const { pointColor, ringColor } = getPointColor(log.status || 0);

        // Create point data for the dot
        const newPoint = {
            lat: location.latitude,
            lng: location.longitude,
            size: 0.25,
            label: `${location.city || 'Unknown'}, ${location.country || 'Unknown'}`,
            ipAddress: log.ipAddress,
            color: pointColor
        } as const;

        // Create ring data for ripple effect at the location
        const newRing = {
            lat: location.latitude,
            lng: location.longitude,
            maxR: 3,
            propagationSpeed: 1,
            repeatPeriod: 1000,
            color: ringColor
        } as const;

        setPointsData(prevPoints => [...prevPoints, newPoint]);
        setRingsData(prevRings => [...prevRings, newRing]);

        // Remove the hex and ring after some time
        setTimeout(() => {
            setRingsData(currentRings =>
                currentRings.filter(ring =>
                    !(ring.lat === location.latitude && ring.lng === location.longitude)
                )
            );
        }, 8000);

        setTimeout(() => {
            setPointsData(currentPoints =>
                currentPoints.filter(point =>
                    !(point.lat === location.latitude && point.lng === location.longitude)
                )
            );
        }, 10000)
    }, [locationMap]);

    // Process data changes to detect new requests
    useEffect(() => {
        // Skip first data load - only show live updates
        if (previousDataRef.current.length === 0) {
            previousDataRef.current = [...data];
            return;
        }

        // Find new requests by comparing with previous data
        const cutoff = Math.max(...previousDataRef.current.map(log => log.timestamp ? log.timestamp.getTime() : 0));
        const newLogs = data.filter(log => log.timestamp && cutoff && log.timestamp.getTime() > cutoff);

        // Update previous data reference
        previousDataRef.current = [...data];

        // If there are new logs, start showing the globe
        if (newLogs.length > 0 && !showGlobe) {
            setShowGlobe(true);
        }

        for (const log of newLogs) {
            if (!log.timestamp) {
                continue;
            }

            const delay = log.timestamp.getTime() - cutoff;
            if (delay > 0) {
                if (locationMap.has(log.ipAddress)) {
                    setTimeout(() => {
                        addRequestToGlobe(log);
                    }, delay)
                } else {
                    // Add to queue if location not immediately found
                    pendingLogsQueue.current.push({ log, delay });
                }
            }
        }
    }, [addRequestToGlobe, data, locationMap, showGlobe]);

    // Process the queue when locationMap changes
    useEffect(() => {
        if (pendingLogsQueue.current.length > 0) {
            // Process all items in the queue
            const currentQueue = [...pendingLogsQueue.current];
            pendingLogsQueue.current = [];

            // Try to process each item
            currentQueue.forEach(item => {
                setTimeout(() => {
                    if (locationMap.has(item.log.ipAddress)) {
                        addRequestToGlobe(item.log);
                    } else {
                        // Retain in queue if location not found
                        pendingLogsQueue.current.push(item);
                    }
                }, item.delay)
            });
        }
    }, [addRequestToGlobe, locationMap]);

    if (!hasLocations) {
        return null; // Don't show anything if locations aren't available
    }

    return (
        <div className="card flex-1 m-3 mt-6 relative overflow-hidden" ref={containerRef}>
            <h2 className="font-semibold absolute left-4 top-3 z-10">
                Live View
            </h2>

            <div className="relative flex justify-center">
                <Globe
                    ref={globeEl}
                    width={containerWidth || undefined}
                    height={GLOBE_HEIGHT}
                    globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
                    backgroundColor="rgba(0,0,0,0)"
                    pointsData={pointsData}
                    pointLabel="label"
                    pointColor="color"
                    pointRadius="size"
                    pointsMerge={true}
                    ringsData={ringsData}
                    ringColor="color"
                    ringMaxRadius="maxR"
                    ringPropagationSpeed="propagationSpeed"
                    ringRepeatPeriod="repeatPeriod"
                />
            </div>
        </div>
    );
}
