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
    BufferAttribute,
    Float32BufferAttribute,
    PointsMaterial,
    Points,
    Group,
    Vector3,
    PointLight,
    LineBasicMaterial,
    Line,
    QuadraticBezierCurve3,
    AmbientLight,
} from 'three';

const CURVE_SEGMENTS = 80;

export default function Globe() {
    const globeRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const scene = new Scene();
        const camera = new PerspectiveCamera(50, document.documentElement.clientWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 300;

        const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(document.documentElement.clientWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);

        if (globeRef.current) {
            globeRef.current.innerHTML = '';
            globeRef.current.appendChild(renderer.domElement);
        }

        const globeRadius = 115;
        const tiltAngle = 23.5 * (Math.PI / 180);

        const globe = new Mesh(
            new SphereGeometry(globeRadius, 64, 64),
            new MeshBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.2, wireframe: true })
        );
        globe.rotation.x = tiltAngle;

        const globeGroup = new Group();
        globeGroup.add(globe);
        scene.add(globeGroup);

        function latLonToVec3(lat: number, lon: number): Vector3 {
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);
            return new Vector3(
                -globeRadius * Math.sin(phi) * Math.cos(theta),
                globeRadius * Math.cos(phi),
                globeRadius * Math.sin(phi) * Math.sin(theta)
            );
        }

        // Land dots
        const landPositions: number[] = [];
        for (const [lat, lon] of landPoints) {
            const v = latLonToVec3(lat, lon);
            landPositions.push(v.x, v.y, v.z);
        }
        const landGeo = new BufferGeometry();
        landGeo.setAttribute('position', new Float32BufferAttribute(landPositions, 3));
        const landMesh = new Points(landGeo, new PointsMaterial({ color: 0x1af073, size: 1.2, opacity: 0.8, transparent: true, sizeAttenuation: true }));
        landMesh.rotation.x = tiltAngle;
        globeGroup.add(landMesh);

        // Shared geometry for all moving dots — avoids per-connection allocation
        const sharedDotGeo = new SphereGeometry(0.8, 8, 8);

        // Target
        const [tLat, tLon] = landPoints[Math.floor(Math.random() * landPoints.length)];
        const targetPos = latLonToVec3(tLat, tLon);

        const targetMarker = new Mesh(new SphereGeometry(2.5, 16, 16), new MeshBasicMaterial({ color: 0x1af073 }));
        targetMarker.position.copy(targetPos);
        globeGroup.add(targetMarker);

        const pulsingLight = new PointLight(0x1af073, 1, 20);
        pulsingLight.position.copy(targetPos);
        globeGroup.add(pulsingLight);

        const glowSphere = new Mesh(
            new SphereGeometry(4, 16, 16),
            new MeshBasicMaterial({ color: 0x1af073, transparent: true, opacity: 0.3 })
        );
        glowSphere.position.copy(targetPos);
        globeGroup.add(glowSphere);

        const target = { position: targetPos, latLon: [tLat, tLon], glow: glowSphere, light: pulsingLight };

        function randomColor() {
            const r = Math.random();
            if (r < 0.4) return 0x1af073;
            if (r < 0.8) return 0x00bfff;
            if (r < 0.9) return 0xffaa4b;
            return 0xff5050;
        }

        // Pre-allocate a line geometry with all curve points up front, use setDrawRange to
        // reveal it progressively — avoids allocating a new BufferGeometry every frame.
        function buildPreallocatedLineGeo(points: Vector3[]): BufferGeometry {
            const arr = new Float32Array((CURVE_SEGMENTS + 1) * 3);
            for (let i = 0; i < points.length; i++) {
                arr[i * 3]     = points[i].x;
                arr[i * 3 + 1] = points[i].y;
                arr[i * 3 + 2] = points[i].z;
            }
            const geo = new BufferGeometry();
            geo.setAttribute('position', new BufferAttribute(arr, 3));
            geo.setDrawRange(0, 1);
            return geo;
        }

        const connections: any[] = [];
        const maxConnections = 25;

        function createConnection(now: number) {
            if (connections.length >= maxConnections) return;

            const startArr = landPoints[Math.floor(Math.random() * landPoints.length)];
            const dist = Math.hypot(startArr[0] - target.latLon[0], startArr[1] - target.latLon[1]);
            if (dist < 15) return;

            const startPos = latLonToVec3(startArr[0], startArr[1]);
            const endPos = target.position;

            const midPoint = new Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
            const midLen = midPoint.length();
            midPoint.normalize().multiplyScalar(midLen * 1.3);

            const curve = new QuadraticBezierCurve3(startPos, midPoint, endPos);
            const returnCurve = new QuadraticBezierCurve3(endPos, midPoint, startPos);
            const points = curve.getPoints(CURVE_SEGMENTS);
            const returnPoints = returnCurve.getPoints(CURVE_SEGMENTS);

            const color = randomColor();
            const lineGeo = buildPreallocatedLineGeo(points);
            const returnLineGeo = buildPreallocatedLineGeo(returnPoints);

            const line = new Line(lineGeo, new LineBasicMaterial({ color, transparent: true, opacity: 0.6 }));
            const returnLine = new Line(returnLineGeo, new LineBasicMaterial({ color, transparent: true, opacity: 0.6 }));
            globeGroup.add(line);
            globeGroup.add(returnLine);

            const movingDot = new Mesh(sharedDotGeo, new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
            movingDot.position.copy(startPos);
            globeGroup.add(movingDot);

            const returnDot = new Mesh(sharedDotGeo, new MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
            returnDot.position.copy(endPos);
            returnDot.visible = false;
            globeGroup.add(returnDot);

            connections.push({
                line, returnLine, movingDot, returnDot,
                points, returnPoints,
                totalPoints: points.length,
                duration: 2 + Math.random() * 3,
                startTime: now,
                returnStartTime: 0,
                outboundComplete: false,
                returnComplete: false,
                fadeStartTime: 0,
                fadeDuration: 1.2,
                fading: false,
            });
        }

        scene.add(new AmbientLight(0xffffff, 0.6));

        // rad/ms — equivalent to 0.0005 rad/frame at 60fps
        const rotationSpeed = 0.00003;
        let lastTime = performance.now();
        let animId: number;

        const animate = (now: number) => {
            animId = requestAnimationFrame(animate);

            const delta = Math.min(now - lastTime, 50); // cap at 50ms to avoid jumps after tab switch
            lastTime = now;
            globeGroup.rotation.y += rotationSpeed * delta;

            // Update connections
            const toRemove: number[] = [];
            for (let i = 0; i < connections.length; i++) {
                const c = connections[i];

                if (!c.outboundComplete) {
                    const progress = Math.min(Math.max(0, (now - c.startTime) / 1000 / c.duration), 1);
                    const idx = Math.min(Math.floor(progress * (c.points.length - 1)), c.points.length - 1);
                    c.line.geometry.setDrawRange(0, idx + 1);
                    c.movingDot.position.copy(c.points[idx]);
                    if (progress >= 1) {
                        c.outboundComplete = true;
                        c.returnStartTime = now;
                        c.returnDot.visible = true;
                    }
                }

                if (c.outboundComplete && !c.returnComplete) {
                    const progress = Math.min(Math.max(0, (now - c.returnStartTime) / 1000 / c.duration), 1);
                    const idx = Math.min(Math.floor(progress * (c.returnPoints.length - 1)), c.returnPoints.length - 1);
                    c.returnLine.geometry.setDrawRange(0, idx + 1);
                    c.returnDot.position.copy(c.returnPoints[idx]);
                    if (progress >= 1) {
                        c.returnComplete = true;
                        c.fadeStartTime = now;
                        c.fading = true;
                    }
                }

                if (c.fading) {
                    const fadeProgress = Math.min((now - c.fadeStartTime) / 1000 / c.fadeDuration, 1);
                    const opacity = 0.6 * (1 - fadeProgress);
                    c.line.material.opacity = opacity;
                    c.returnLine.material.opacity = opacity;
                    c.movingDot.material.opacity = opacity;
                    c.returnDot.material.opacity = opacity;
                    if (fadeProgress >= 1) toRemove.push(i);
                }
            }

            for (let i = toRemove.length - 1; i >= 0; i--) {
                const c = connections[toRemove[i]];
                globeGroup.remove(c.line, c.returnLine, c.movingDot, c.returnDot);
                c.line.geometry.dispose();
                c.line.material.dispose();
                c.returnLine.geometry.dispose();
                c.returnLine.material.dispose();
                c.movingDot.material.dispose();
                c.returnDot.material.dispose();
                connections.splice(toRemove[i], 1);
            }

            if (connections.length < maxConnections && Math.random() < 0.05) {
                createConnection(now);
            }

            // Pulse target
            const pulseScale = 1 + 0.2 * Math.sin(now * 0.005);
            target.glow.scale.set(pulseScale, pulseScale, pulseScale);
            target.light.intensity = 1 + 0.5 * Math.sin(now * 0.005);

            renderer.render(scene, camera);
        };

        // Seed initial connections
        const t0 = performance.now();
        for (let i = 0; i < 8; i++) createConnection(t0);

        animId = requestAnimationFrame(animate);

        const handleResize = () => {
            camera.aspect = document.documentElement.clientWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(document.documentElement.clientWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', handleResize);
            connections.forEach(c => {
                c.line.geometry.dispose();
                c.line.material.dispose();
                c.returnLine.geometry.dispose();
                c.returnLine.material.dispose();
                c.movingDot.material.dispose();
                c.returnDot.material.dispose();
            });
            globe.geometry.dispose();
            globe.material.dispose();
            landGeo.dispose();
            sharedDotGeo.dispose();
            renderer.dispose();
            scene.clear();
            if (globeRef.current) globeRef.current.innerHTML = '';
        };
    }, []);

    return <div ref={globeRef} className="w-full h-full" />;
}
