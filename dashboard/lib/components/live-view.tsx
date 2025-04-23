"use client";

import { NginxLog } from "@/lib/types";
import 'chartjs-adapter-date-fns';
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { type Location } from "@/lib/location"

// Dynamically import the Globe component with ssr disabled
const Globe = dynamic(
    () => import('react-globe.gl'),
    { ssr: false } // This prevents the component from being rendered on the server
);

// Constants for globe configuration
const GLOBE_HEIGHT = 500;
const SPIKE_COLOR = "rgba(255,255,0,0.8)"; // Yellow spikes
const SPIKE_MAX_HEIGHT = 0.5; // Max height of spikes relative to globe radius

export default function LiveView({ data, locationMap }: { data: NginxLog[], locationMap: Map<string, Location> }) {
    const globeEl = useRef<any>(null);
    const [showGlobe, setShowGlobe] = useState(false);
    const [ringsData, setRingsData] = useState<any[]>([]);
    const [hexData, setHexData] = useState<any[]>([]);
    const [pointsData, setPointsData] = useState<any[]>([]);
    const previousDataRef = useRef<NginxLog[]>([]);
    const [hasLocations, setHasLocations] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) return;

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

    // Process data changes to detect new requests
    useEffect(() => {
        // Skip first data load - only show live updates
        if (previousDataRef.current.length === 0) {
            previousDataRef.current = [...data];
            console.log('setting initial logs', previousDataRef.current);
            return;
        }

        // Find new requests by comparing with previous data
        const cutoff = Math.max(...previousDataRef.current.map(log => log.timestamp ? log.timestamp.getTime() : 0));
        const newLogs = data.filter(log => log.timestamp && cutoff && log.timestamp.getTime() > cutoff);

        console.log(cutoff, "cutoff");
        console.log(newLogs, "new logs");

        // Update previous data reference
        previousDataRef.current = [...data];

        // If there are new logs, start showing the globe
        if (newLogs.length > 0 && !showGlobe) {
            setShowGlobe(true);
        }

        const getLocation = (log: NginxLog) => {
            if (!log.ipAddress) {
                return null;
            }
            const location = locationMap.get(log.ipAddress);
            if (location) {
                return location;
            }
            return null;
        };

        // Function to add a new request to the globe
        const addRequestToGlobe = (log: NginxLog) => {
            const location = getLocation(log);
            if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
                return null;
            }

            // Ensure coordinates are valid numbers
            if (isNaN(location.latitude) || isNaN(location.longitude)) {
                console.warn("Invalid coordinates for IP:", log.ipAddress);
                return null;
            }

            // Create point data for the dot
            const newPoint = {
                lat: location.latitude,
                lng: location.longitude,
                color: 'yellow',
                size: 0.5,
                label: `${location.city || 'Unknown'}, ${location.country || 'Unknown'}`,
                ip: log.ipAddress
            };

            // Create hex (spike) data for the tower effect
            const newHex = {
                lat: location.latitude,
                lng: location.longitude,
                height: SPIKE_MAX_HEIGHT,
                color: SPIKE_COLOR
            };

            // Create ring data for ripple effect at the location
            const newRing = {
                lat: location.latitude,
                lng: location.longitude,
                maxR: 5,
                propagationSpeed: 1,
                repeatPeriod: 1000
            };

            setPointsData(prevPoints => [...prevPoints, newPoint]);
            setHexData(prevHex => [...prevHex, newHex]);
            setRingsData(prevRings => [...prevRings, newRing]);

            // Remove the hex and ring after some time
            setTimeout(() => {
                setHexData(currentHex =>
                    currentHex.filter(hex =>
                        !(hex.lat === location.latitude && hex.lng === location.longitude)
                    )
                );

                setRingsData(currentRings =>
                    currentRings.filter(ring =>
                        !(ring.lat === location.latitude && ring.lng === location.longitude)
                    )
                );
            }, 3000);
        };

        // Add each new request to the globe view
        newLogs.forEach(log => {
            addRequestToGlobe(log);
        });
    }, [data, showGlobe]);

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
                    hexPolygonsData={hexData}
                    hexPolygonColor="color"
                    // hexPolygonHeight="height"
                    hexPolygonResolution={3}
                    hexPolygonMargin={0.2}
                    ringsData={ringsData}
                    ringColor={() => SPIKE_COLOR}
                    ringMaxRadius="maxR"
                    ringPropagationSpeed="propagationSpeed"
                    ringRepeatPeriod="repeatPeriod"
                />
            </div>
        </div>
    );
}