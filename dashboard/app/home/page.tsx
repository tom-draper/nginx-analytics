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
  AmbientLight
} from 'three';

export default function TiltedGlobeSingleTarget() {
	const mountRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		// Initialize Three.js scene
		const scene = new Scene();
		const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
		camera.position.z = 300;

		const renderer = new WebGLRenderer({ antialias: true, alpha: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setClearColor(0x000000, 0);

		if (mountRef.current) {
			mountRef.current.innerHTML = '';
			mountRef.current.appendChild(renderer.domElement);
		}

		// Globe parameters
		const globeRadius = 115;

		// Create globe base (nearly invisible)
		const shellGeometry = new SphereGeometry(globeRadius, 64, 64);
		const shellMaterial = new MeshBasicMaterial({
			color: 0x1a1a2e,
			transparent: true,
			opacity: 0.2,
			wireframe: true
		});
		const globe = new Mesh(shellGeometry, shellMaterial);

		// Initialize outside the loop
		const lineGeometry = new BufferGeometry();
		const positionAttribute = new BufferAttribute(new Float32Array(51 * 3), 3);
		lineGeometry.setAttribute('position', positionAttribute);

		// Apply tilt to the globe (23.5 degrees like Earth's axial tilt)
		const tiltAngle = 23.5 * (Math.PI / 180);
		globe.rotation.x = tiltAngle;
		scene.add(globe);

		// Globe group to contain all elements that should rotate together
		const globeGroup = new Group();
		globeGroup.add(globe);
		scene.add(globeGroup);


		// Create a points material for land dots
		const dotMaterial = new PointsMaterial({
			color: 0x1af073,
			size: 1.2,
			opacity: 0.8,
			transparent: true,
			sizeAttenuation: true
		});

		// Create a denser distribution of points within each landmass
		function createDenseLandDots() {
			const positions: any[] = [];
			const allLandCoords: number[][] = [];

			// Process each continent
			landPoints.forEach(continent => {
				// Create a grid of points for each continent
				const boundingBox = getBoundingBox(continent);
				const gridSize = calculateGridSize(boundingBox, 0.5); // Density factor

				// Create points within the grid
				for (let lat = boundingBox.minLat; lat <= boundingBox.maxLat; lat += gridSize) {
					for (let lon = boundingBox.minLon; lon <= boundingBox.maxLon; lon += gridSize) {
						// Check if point is inside the continent polygon
						if (isPointInPolygon([lat, lon], continent)) {
							const vector = latLongToVector3(lat, lon, globeRadius);
							positions.push(vector.x, vector.y, vector.z);
							allLandCoords.push([lat, lon]);
						}
					}
				}

				// Add the outline points too for better definition
				continent.forEach(point => {
					const vector = latLongToVector3(point[0], point[1], globeRadius);
					positions.push(vector.x, vector.y, vector.z);
					allLandCoords.push(point);
				});
			});

			const geometry = new BufferGeometry();
			geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

			const pointCloud = new Points(geometry, dotMaterial);
			pointCloud.rotation.x = tiltAngle; // Apply same tilt as the globe
			globeGroup.add(pointCloud);

			return { pointCloud, allLandCoords };
		}

		// Helper: Calculate bounding box for a continent
		function getBoundingBox(continent: any[]) {
			let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;

			continent.forEach((point: number[]) => {
				minLat = Math.min(minLat, point[0]);
				maxLat = Math.max(maxLat, point[0]);
				minLon = Math.min(minLon, point[1]);
				maxLon = Math.max(maxLon, point[1]);
			});

			return { minLat, maxLat, minLon, maxLon };
		}

		// Helper: Calculate grid size based on bounding box
		function calculateGridSize(boundingBox: { minLat: any; maxLat: any; minLon: any; maxLon: any; }, densityFactor: number) {
			const width = boundingBox.maxLon - boundingBox.minLon;
			const height = boundingBox.maxLat - boundingBox.minLat;
			const maxDimension = Math.max(width, height);

			// This determines point density - smaller number = more points
			return maxDimension / (100 * densityFactor);
		}

		// Helper: Check if a point is inside a polygon using ray casting algorithm
		function isPointInPolygon(point: any[], polygon: string | any[]) {
			// Simple implementation of ray-casting algorithm
			let inside = false;
			const x = point[0], y = point[1];

			for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
				const xi = polygon[i][0], yi = polygon[i][1];
				const xj = polygon[j][0], yj = polygon[j][1];

				const intersect = ((yi > y) !== (yj > y)) &&
					(x < (xj - xi) * (y - yi) / (yj - yi) + xi);

				if (intersect) inside = !inside;
			}

			return inside;
		}

		// Convert lat/long to 3D coordinates
		function latLongToVector3(lat: number, lon: number, radius: number) {
			const phi = (90 - lat) * (Math.PI / 180);
			const theta = (lon + 180) * (Math.PI / 180);

			const x = -radius * Math.sin(phi) * Math.cos(theta);
			const y = radius * Math.cos(phi);
			const z = radius * Math.sin(phi) * Math.sin(theta);

			return new Vector3(x, y, z);
		}

		// Create land dots
		const { pointCloud: landDots, allLandCoords } = createDenseLandDots();

		// Modify the target point color from red to white
		const getRandomTargetPoint = () => {
			const randomIndex = Math.floor(Math.random() * allLandCoords.length);
			const targetLatLon = allLandCoords[randomIndex];
			const targetPosition = latLongToVector3(targetLatLon[0], targetLatLon[1], globeRadius);

			// Create a visible target marker (changed from red to white)
			const targetMarker = new Mesh(
				new SphereGeometry(2.5, 16, 16),
				new MeshBasicMaterial({ color: 0x1af073 }) // Changed from 0xff3366 to 0xffffff
			);
			targetMarker.position.copy(targetPosition);
			targetMarker.rotation.x = tiltAngle; // Apply tilt to marker
			globeGroup.add(targetMarker);

			// Create a pulsing effect for the target (changed from red to white)
			const pulsingLight = new PointLight(0x1af073, 1, 20); // Changed from 0xff3366 to 0xffffff
			pulsingLight.position.copy(targetPosition);
			globeGroup.add(pulsingLight);

			// Create a glow sphere (changed from red to white)
			const glowSphere = new Mesh(
				new SphereGeometry(4, 16, 16),
				new MeshBasicMaterial({
					color: 0x1af073, // Changed from 0xff3366 to 0xffffff
					transparent: true,
					opacity: 0.3
				})
			);
			glowSphere.position.copy(targetPosition);
			globeGroup.add(glowSphere);

			return {
				position: targetPosition,
				marker: targetMarker,
				light: pulsingLight,
				glow: glowSphere,
				latLon: targetLatLon
			};
		};

		// Function to get a random color based on specified probabilities
		function getRandomRequestColor() {
			const rand = Math.random();
			if (rand < 0.4) {
				return 0x1af073; // 40% chance for green
			} else if (rand < 0.8) {
				return 0x00bfff; // 40% chance for blue
			} else if (rand < 0.9) {
				return 0xffaa4b; // 10% chance for orange
			} else {
				return 0xff5050; // 10% chance for red
			}
		}

		// Function to create a new connection
		function createConnection() {
			if (connections.length >= maxConnections) return;

			// Get random start point but fixed end point (target)
			const startContinent = Math.floor(Math.random() * landPoints.length);
			const startPointArray = landPoints[startContinent][Math.floor(Math.random() * landPoints[startContinent].length)];

			// Make sure start point is not too close to target
			const distance = Math.sqrt(
				Math.pow(startPointArray[0] - target.latLon[0], 2) +
				Math.pow(startPointArray[1] - target.latLon[1], 2)
			);

			if (distance < 15) return; // Too close, try again next time

			// Convert to 3D positions
			const startPosition = latLongToVector3(startPointArray[0], startPointArray[1], globeRadius);
			const endPosition = target.position;

			// Create midpoint for arced path
			const midPoint = new Vector3().addVectors(startPosition, endPosition).multiplyScalar(0.5);

			// Push midpoint outward
			const midPointLength = midPoint.length();
			midPoint.normalize().multiplyScalar(midPointLength * 1.3);

			// Create curve
			const curve = new QuadraticBezierCurve3(
				startPosition,
				midPoint,
				endPosition
			);

			// Create the return curve (from target back to origin)
			const returnCurve = new QuadraticBezierCurve3(
				endPosition,
				midPoint,
				startPosition
			);

			// Create curve points
			const curvePoints = curve.getPoints(50);
			const returnCurvePoints = returnCurve.getPoints(50);

			// Create an empty line geometry - will be updated during animation
			const lineGeometry = new BufferGeometry().setFromPoints([curvePoints[0]]);
			const returnLineGeometry = new BufferGeometry().setFromPoints([returnCurvePoints[0]]);

			// Get random color for this connection based on specified distribution
			const connectionColor = getRandomRequestColor();

			// Create line material with the random color
			const lineMaterial = new LineBasicMaterial({
				color: connectionColor, // Using random color instead of fixed blue
				transparent: true,
				opacity: 0.6
			});

			const returnLineMaterial = new LineBasicMaterial({
				color: connectionColor, // Same random color for return path
				transparent: true,
				opacity: 0.6
			});

			const line = new Line(lineGeometry, lineMaterial);
			const returnLine = new Line(returnLineGeometry, returnLineMaterial);
			globeGroup.add(line);
			globeGroup.add(returnLine);

			// Create moving dot for outbound path
			const dotGeometry = new SphereGeometry(0.8, 8, 8);
			const dotMaterial = new MeshBasicMaterial({
				color: connectionColor, // Using random color instead of fixed blue
				transparent: true,
				opacity: 0.9
			});

			const movingDot = new Mesh(dotGeometry, dotMaterial);
			movingDot.position.copy(startPosition);
			globeGroup.add(movingDot);

			// Create moving dot for return path
			const returnDotMaterial = new MeshBasicMaterial({
				color: connectionColor, // Using random color instead of fixed blue
				transparent: true,
				opacity: 0.9
			});

			const returnDot = new Mesh(dotGeometry, returnDotMaterial);
			returnDot.position.copy(endPosition);
			returnDot.visible = false; // Hidden until outbound journey completes
			globeGroup.add(returnDot);

			connections.push({
				// Outbound properties
				line,
				movingDot,
				curve,
				points: curvePoints,
				progress: 0,

				// Return journey properties
				returnLine,
				returnDot,
				returnCurve,
				returnPoints: returnCurvePoints,
				returnProgress: 0,

				// Shared properties
				totalPoints: curvePoints.length,
				duration: 2 + Math.random() * 3, // Random duration between 2-5 seconds
				startTime: Date.now(),
				returnStartTime: null, // Will be set when outbound journey completes

				// States
				complete: false,
				outboundComplete: false,
				returnComplete: false,

				// Fade properties
				fadeStartTime: null,
				fadeDuration: 1.2, // Seconds to fade out
				fading: false
			});
		}

		// Set the single target for all connections
		const target = getRandomTargetPoint();

		// Active connections lines
		const connections: any[] = [];
		const maxConnections = 25;

		// Update connections
		function updateConnections() {
			const now = Date.now();
			const connectionsToRemove: any[] = [];

			connections.forEach((connection, index) => {
				// Handle outbound journey if not complete
				if (!connection.outboundComplete) {
					const elapsedTime = (now - connection.startTime) / 1000;
					connection.progress = Math.min(elapsedTime / connection.duration, 1);

					// Calculate current point index
					const pointIndex = Math.floor(connection.progress * (connection.totalPoints - 1));

					// Update line geometry to draw up to current point
					const linePoints = connection.points.slice(0, pointIndex + 1);
					connection.line.geometry.dispose();
					connection.line.geometry = new BufferGeometry().setFromPoints(linePoints);

					// Update moving dot position
					if (pointIndex < connection.totalPoints) {
						connection.movingDot.position.copy(connection.points[pointIndex]);
					}

					// Check if outbound journey is complete
					if (connection.progress >= 1) {
						connection.outboundComplete = true;
						connection.returnStartTime = now;
						connection.returnDot.visible = true; // Show return dot
					}
				}

				// Handle return journey if outbound is complete but return is not
				if (connection.outboundComplete && !connection.returnComplete) {
					const returnElapsedTime = (now - connection.returnStartTime) / 1000;
					connection.returnProgress = Math.min(returnElapsedTime / connection.duration, 1);

					// Calculate current point index for return journey
					const returnPointIndex = Math.floor(connection.returnProgress * (connection.totalPoints - 1));

					// Update return line geometry
					const returnLinePoints = connection.returnPoints.slice(0, returnPointIndex + 1);
					connection.returnLine.geometry.dispose();
					connection.returnLine.geometry = new BufferGeometry().setFromPoints(returnLinePoints);

					// Update return dot position
					if (returnPointIndex < connection.totalPoints) {
						connection.returnDot.position.copy(connection.returnPoints[returnPointIndex]);
					}

					// Check if return journey is complete
					if (connection.returnProgress >= 1) {
						connection.returnComplete = true;
						connection.fadeStartTime = now;
						connection.fading = true;
					}
				}

				// Handle fading after both journeys are complete
				if (connection.fading) {
					const fadeElapsedTime = (now - connection.fadeStartTime) / 1000;
					const fadeProgress = Math.min(fadeElapsedTime / connection.fadeDuration, 1);

					// Fade out both lines and dots
					const remainingOpacity = 0.6 * (1 - fadeProgress);
					connection.line.material.opacity = remainingOpacity;
					connection.returnLine.material.opacity = remainingOpacity;
					connection.movingDot.material.opacity = remainingOpacity;
					connection.returnDot.material.opacity = remainingOpacity;

					// When fade is complete, mark for removal
					if (fadeProgress >= 1) {
						connection.complete = true;
						connectionsToRemove.push(index);
					}
				}
			});

			// Remove completed connections
			for (let i = connectionsToRemove.length - 1; i >= 0; i--) {
				const index = connectionsToRemove[i];
				const connection = connections[index];

				// Remove all elements from scene
				globeGroup.remove(connection.line);
				globeGroup.remove(connection.returnLine);
				globeGroup.remove(connection.movingDot);
				globeGroup.remove(connection.returnDot);

				// Dispose of geometries and materials
				connection.line.geometry.dispose();
				connection.line.material.dispose();
				connection.returnLine.geometry.dispose();
				connection.returnLine.material.dispose();
				connection.movingDot.geometry.dispose();
				connection.movingDot.material.dispose();
				connection.returnDot.geometry.dispose();
				connection.returnDot.material.dispose();

				// Remove from connections array
				connections.splice(index, 1);
			}

			// Create new connections to maintain flow
			if (connections.length < maxConnections && Math.random() < 0.05) {
				createConnection();
			}

			// Pulse the target
			const pulseScale = 1 + 0.2 * Math.sin(now * 0.005);
			target.glow.scale.set(pulseScale, pulseScale, pulseScale);
			target.light.intensity = 1 + 0.5 * Math.sin(now * 0.005);
		}

		// Add ambient light
		const ambientLight = new AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);

		// Rotation settings
		const rotationSpeed = 0.0005;

		// Window resize handler
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		// Create initial connections
		for (let i = 0; i < 8; i++) {
			createConnection();
		}

		// Animation loop
		const animate = () => {
			requestAnimationFrame(animate);

			// Rotate globe group - this rotates everything together
			globeGroup.rotation.y += rotationSpeed;

			// Update connections
			updateConnections();

			renderer.render(scene, camera);
		};

		animate();

		return () => {
			window.removeEventListener('resize', handleResize);

			// Dispose of all Three.js objects
			renderer.dispose();

			// Dispose of all geometries and materials
			globe.geometry.dispose();
			globe.material.dispose();

			// Dispose of all connections
			connections.forEach(connection => {
				connection.line.geometry.dispose();
				connection.line.material.dispose();
				connection.returnLine.geometry.dispose();
				connection.returnLine.material.dispose();
				connection.movingDot.geometry.dispose();
				connection.movingDot.material.dispose();
				connection.returnDot.geometry.dispose();
				connection.returnDot.material.dispose();
			});

			// Clear all references
			scene.clear();

			if (mountRef.current) {
				mountRef.current.innerHTML = '';
			}
		};
	}, []);

	return (
		<div className="w-full h-screen bg-[var(--background)]">
			<div className="w-full absolute top-0">
				<nav className="py-4 px-6 m-auto flex text-center font-semibold text-[#3f3f3f]" style={{ fontFamily: 'Helvetica, Geist, Helveica, Arial, sans-serif' }}>
					<div>
						<img src="/lightning-green.svg" alt="" className="h-8" />
					</div>
					<div className="mx-5 mr-8 my-auto text-md" >API Analytics | NGINX</div>

					<div className="my-auto ml-auto font-medium">
						<a href="" className="mx-2 text-sm hover:text-[white]">Home</a>
						<a href="" className="mx-2 text-sm hover:text-[white]">About</a>
						<a href="https://github.com/tom-draper/nginx-analytics" className="mx-2 text-sm hover:text-[white]">Source</a>
					</div>
				</nav>
			</div>
			<h1 className="w-full text-center text-white pt-[53.5vh] font-bold text-3xl" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>It&apos;s you versus the world.</h1>

			<div className="absolute w-full h-full top-[50vh]">
				<div className="relative">
					<div ref={mountRef} className="w-full h-full overflow-hidden"></div>
					<div className="absolute inset-0" style={{background: 'linear-gradient(transparent 50%, #0a0a0a 60%)'}}></div>
				</div>
			</div>

			<div className="absolute bottom-4 w-full grid place-items-center">
				<div className="w-fit rounded p-3 border border-[var(--border-color)] flex gap-3 bg-opacity-80 backdrop-blur-sm">
					<a className="cursor-pointer bg-[var(--highlight)] rounded p-4 py-2 w-30 text-black text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://github.com/tom-draper/nginx-analytics">Get Started</a>
					<a className="cursor-pointer rounded p-4 bg-[var(--card-background)] text-[#ffffffdd] border border-[var(--border-color)] w-30 py-2 text-center place-content-center bg-opacity-80 backdrop-blur-sm" href="https://nginx.apianalytics.dev/dashboard/demo">Demo</a>
				</div>
			</div>
		</div>
	);
}