"use client";

import { landPoints } from '@/lib/globe';
import { useEffect, useRef } from 'react';
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    SphereGeometry,
    MeshBasicMaterial,
    Mesh,
    BufferGeometry,
    Float32BufferAttribute,
    PointsMaterial,
    Points,
    Group,
    Vector3,
    AmbientLight,
} from 'three';

export type LiveEvent = {
    id: string;
    lat: number;
    lon: number;
    status: number | null;
};

type Beacon = {
    core: Mesh;
    glow: Mesh;
    startTime: number;
    duration: number;
};

function statusColor(status: number | null): number {
    if (!status) return 0x888888;
    if (status < 300) return 0x1af073; // green  — 2xx
    if (status < 400) return 0x00bfff; // blue   — 3xx
    if (status < 500) return 0xffaa4b; // orange — 4xx
    return 0xff5050;                    // red    — 5xx
}

function latLonToVec3(lat: number, lon: number, radius: number): Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
    );
}

function isInPolygon(point: number[], polygon: number[][]): boolean {
    let inside = false;
    const [x, y] = point;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

interface Props {
    events: LiveEvent[];
}

function isWebGLAvailable(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch {
        return false;
    }
}

export default function LiveGlobe({ events }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const processedRef = useRef(0);
    const queueRef = useRef<LiveEvent[]>([]);
    const beaconsRef = useRef<Beacon[]>([]);

    // Sync new events from prop into the internal queue
    useEffect(() => {
        const newEvents = events.slice(processedRef.current);
        queueRef.current.push(...newEvents);
        processedRef.current = events.length;
    }, [events]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        if (!isWebGLAvailable()) {
            container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#4b5563;font-size:0.8rem;">WebGL unavailable</div>`;
            return;
        }

        // ── Scene setup ──────────────────────────────────────────────────────
        const scene = new Scene();
        const camera = new PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 300;

        const renderer = new WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0x000000, 0);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        const globeRadius = 115;
        const tiltAngle = 23.5 * (Math.PI / 180);
        const globeGroup = new Group();
        scene.add(globeGroup);

        // ── Globe shell ──────────────────────────────────────────────────────
        const shellGeo = new SphereGeometry(globeRadius, 64, 64);
        const shellMat = new MeshBasicMaterial({ color: 0x0d1117, transparent: true, opacity: 0.5, wireframe: true });
        const shell = new Mesh(shellGeo, shellMat);
        shell.rotation.x = tiltAngle;
        globeGroup.add(shell);

        // ── Land dots ────────────────────────────────────────────────────────
        const landPositions: number[] = [];
        landPoints.forEach((continent: number[][]) => {
            let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
            continent.forEach((p: number[]) => {
                if (p[0] < minLat) minLat = p[0]; if (p[0] > maxLat) maxLat = p[0];
                if (p[1] < minLon) minLon = p[1]; if (p[1] > maxLon) maxLon = p[1];
            });
            const step = Math.max(maxLon - minLon, maxLat - minLat) / 50;
            for (let lat = minLat; lat <= maxLat; lat += step) {
                for (let lon = minLon; lon <= maxLon; lon += step) {
                    if (isInPolygon([lat, lon], continent)) {
                        const v = latLonToVec3(lat, lon, globeRadius);
                        landPositions.push(v.x, v.y, v.z);
                    }
                }
            }
            continent.forEach((p: number[]) => {
                const v = latLonToVec3(p[0], p[1], globeRadius);
                landPositions.push(v.x, v.y, v.z);
            });
        });

        const landGeo = new BufferGeometry();
        landGeo.setAttribute('position', new Float32BufferAttribute(landPositions, 3));
        const landMat = new PointsMaterial({ color: 0x1af073, size: 1.2, opacity: 0.7, transparent: true, sizeAttenuation: true });
        const landDots = new Points(landGeo, landMat);
        landDots.rotation.x = tiltAngle;
        globeGroup.add(landDots);

        scene.add(new AmbientLight(0xffffff, 0.6));

        // ── Beacon spawning ──────────────────────────────────────────────────
        function spawnBeacon(event: LiveEvent) {
            const color = statusColor(event.status);
            const pos = latLonToVec3(event.lat, event.lon, globeRadius + 1);

            const core = new Mesh(
                new SphereGeometry(2.5, 10, 10),
                new MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
            );
            core.position.copy(pos);
            core.rotation.x = tiltAngle;
            globeGroup.add(core);

            const glow = new Mesh(
                new SphereGeometry(5, 10, 10),
                new MeshBasicMaterial({ color, transparent: true, opacity: 0.3 }),
            );
            glow.position.copy(pos);
            glow.rotation.x = tiltAngle;
            globeGroup.add(glow);

            beaconsRef.current.push({ core, glow, startTime: Date.now(), duration: 2.5 });
        }

        // ── Animation loop ───────────────────────────────────────────────────
        let animId: number;
        let lastSpawnTime = 0;
        const SPAWN_INTERVAL = 150; // max ~6-7 beacons/second

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const now = Date.now();

            // Dequeue one pending event per interval
            if (queueRef.current.length > 0 && now - lastSpawnTime >= SPAWN_INTERVAL) {
                spawnBeacon(queueRef.current.shift()!);
                lastSpawnTime = now;
            }

            // Update active beacons
            const done: number[] = [];
            beaconsRef.current.forEach((b, i) => {
                const t = Math.min((now - b.startTime) / (b.duration * 1000), 1);
                if (t >= 1) { done.push(i); return; }

                // Scale: pop in, hold, fade out
                const scale = t < 0.2 ? t / 0.2 : t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
                const opacity = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;

                b.core.scale.setScalar(scale);
                b.glow.scale.setScalar(0.5 + scale * 2.0 * t); // expands outward as it fades
                (b.core.material as MeshBasicMaterial).opacity = opacity;
                (b.glow.material as MeshBasicMaterial).opacity = opacity * 0.25;
            });

            // Remove finished beacons (reverse to preserve indices)
            for (let i = done.length - 1; i >= 0; i--) {
                const b = beaconsRef.current.splice(done[i], 1)[0];
                globeGroup.remove(b.core);
                globeGroup.remove(b.glow);
                b.core.geometry.dispose();
                (b.core.material as MeshBasicMaterial).dispose();
                b.glow.geometry.dispose();
                (b.glow.material as MeshBasicMaterial).dispose();
            }

            globeGroup.rotation.y += 0.0004;
            renderer.render(scene, camera);
        };

        animate();

        const onResize = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
            beaconsRef.current.forEach(b => {
                b.core.geometry.dispose();
                (b.core.material as MeshBasicMaterial).dispose();
                b.glow.geometry.dispose();
                (b.glow.material as MeshBasicMaterial).dispose();
            });
            beaconsRef.current = [];
            queueRef.current = [];
            processedRef.current = 0;
            landGeo.dispose();
            landMat.dispose();
            shellGeo.dispose();
            shellMat.dispose();
            renderer.dispose();
            scene.clear();
            container.innerHTML = '';
        };
    }, []);

    return <div ref={containerRef} className="w-full h-full" />;
}
