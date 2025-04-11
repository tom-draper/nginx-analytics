"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function TiltedGlobeSingleTarget() {
  const mountRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 300;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }
    
    // Globe parameters
    const globeRadius = 115;
    
    // Create globe base (nearly invisible)
    const shellGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    const globe = new THREE.Mesh(shellGeometry, shellMaterial);
    
    // Apply tilt to the globe (23.5 degrees like Earth's axial tilt)
    // const tiltAngle = 23.5 * (Math.PI / 180);
    const tiltAngle = 23.5 * (Math.PI / 180);
    globe.rotation.x = tiltAngle;
    scene.add(globe);
    
    // Globe group to contain all elements that should rotate together
    const globeGroup = new THREE.Group();
    globeGroup.add(globe);
    scene.add(globeGroup);
    
    // Country coordinates data - simplified world map data
    const landPoints = [
      // North America
      [
        [48, -124], [50, -122], [48, -120], [45, -122], [42, -124], [40, -124], [37, -122], [33, -117],
        [32, -114], [32, -112], [31, -111], [31, -106], [29, -103], [29, -99], [28, -97], [27, -97],
        [26, -97], [30, -94], [31, -93], [33, -91], [30, -90], [29, -89], [30, -88], [31, -85],
        [30, -84], [28, -82], [26, -80], [25, -81], [27, -82], [31, -81], [32, -80], [35, -77],
        [37, -76], [38, -75], [39, -74], [41, -72], [42, -71], [43, -70], [45, -67], [47, -68],
        [48, -69], [48, -67], [45, -66], [45, -64], [46, -63], [47, -65], [48, -65], [49, -64],
        [48, -62], [49, -60], [51, -57], [52, -56], [51, -55], [52, -56], [53, -59], [54, -58],
        [56, -60], [57, -62], [58, -65], [60, -65], [62, -68], [63, -70], [64, -77], [66, -82],
        [67, -86], [68, -90], [69, -95], [70, -103], [70, -110], [70, -120], [68, -130], [69, -135],
        [69, -140], [66, -141], [63, -144], [60, -146], [58, -152], [56, -154], [55, -160], [52, -167],
        [52, -172], [54, -170], [57, -170], [59, -165], [57, -160], [55, -155], [54, -148], [57, -142],
        [58, -136], [56, -132], [54, -130], [51, -128], [49, -123], [48, -124]
      ],
      // South America
      [
        [12, -73], [10, -75], [8, -77], [9, -80], [6, -77], [4, -78], [2, -79], [0, -81], [-3, -80],
        [-6, -81], [-9, -79], [-12, -77], [-14, -76], [-16, -74], [-18, -71], [-20, -70], [-24, -71],
        [-27, -71], [-30, -72], [-33, -71], [-35, -73], [-39, -73], [-42, -73], [-44, -73], [-47, -74],
        [-50, -74], [-53, -72], [-55, -70], [-55, -69], [-52, -69], [-50, -70], [-48, -68], [-46, -67],
        [-43, -65], [-40, -63], [-37, -60], [-35, -58], [-32, -58], [-30, -56], [-28, -55], [-24, -58],
        [-22, -60], [-20, -58], [-17, -58], [-15, -60], [-12, -61], [-10, -63], [-8, -65], [-6, -67],
        [-4, -70], [-1, -72], [1, -75], [4, -74], [6, -72], [9, -73], [10, -72], [12, -73]
      ],
      // Europe
      [
        [36, -10], [38, -9], [40, -9], [42, -9], [44, -10], [44, -8], [43, -5], [43, -2], [42, 0],
        [43, 2], [42, 4], [43, 5], [44, 8], [45, 10], [44, 12], [44, 14], [42, 15], [41, 17],
        [40, 19], [38, 18], [37, 16], [37, 15], [39, 13], [40, 10], [40, 8], [38, 8], [37, 14],
        [35, 12], [36, 10], [35, 16], [38, 26], [40, 29], [42, 27], [45, 29], [47, 30], [49, 32],
        [52, 24], [54, 20], [57, 22], [59, 18], [60, 21], [62, 24], [64, 26], [66, 26], [68, 25],
        [69, 21], [68, 18], [65, 14], [65, 12], [64, 10], [64, 8], [63, 11], [60, 11], [58, 7],
        [58, 5], [57, 8], [55, 9], [54, 8], [54, 12], [56, 12], [56, 16], [54, 18], [52, 14],
        [51, 4], [50, 2], [48, -1], [44, -1], [42, -2], [39, -9], [36, -10]
      ],
      // Africa
      [
        [12, -17], [15, -17], [18, -16], [20, -13], [24, -15], [28, -15], [31, -10], [33, -7], [36, -5],
        [39, -2], [40, 3], [42, 10], [42, 14], [41, 20], [37, 22], [32, 24], [30, 33], [27, 34],
        [22, 37], [16, 38], [12, 44], [12, 48], [10, 44], [5, 40], [1, 40], [-5, 39], [-10, 40],
        [-15, 40], [-20, 40], [-25, 35], [-26, 32], [-26, 28], [-28, 25], [-30, 22], [-32, 18],
        [-34, 19], [-34, 22], [-28, 17], [-25, 15], [-22, 14], [-18, 12], [-15, 12], [-12, 13],
        [-10, 13], [-8, 12], [-6, 10], [-4, 7], [-2, 6], [0, 8], [2, 9], [5, 6], [8, 2], [10, 0],
        [12, -3], [10, -8], [10, -12], [10, -15], [12, -17]
      ],
      // Asia
      [
        [30, 25], [28, 30], [30, 35], [32, 40], [35, 45], [38, 48], [42, 50], [45, 55], [48, 58],
        [50, 60], [55, 65], [58, 68], [60, 70], [65, 75], [68, 78], [70, 80], [72, 85], [70, 90],
        [68, 95], [65, 98], [62, 100], [60, 105], [58, 110], [55, 115], [52, 120], [50, 125],
        [48, 130], [45, 135], [42, 140], [38, 142], [35, 140], [32, 137], [30, 135], [28, 130],
        [25, 125], [22, 120], [18, 115], [15, 110], [12, 105], [8, 100], [5, 95], [2, 98],
        [0, 100], [-2, 102], [-5, 105], [-6, 108], [-5, 110], [-2, 112], [0, 115], [2, 118],
        [5, 120], [8, 125], [10, 128], [12, 130], [15, 135], [18, 138], [20, 140], [22, 145],
        [25, 148], [28, 150], [30, 148], [32, 145], [35, 140], [38, 135], [40, 132], [42, 130],
        [40, 125], [38, 120], [40, 115], [42, 112], [45, 110], [48, 105], [50, 100], [52, 95],
        [55, 90], [58, 85], [60, 80], [58, 75], [55, 70], [52, 65], [50, 60], [48, 55], [45, 50],
        [42, 45], [40, 40], [38, 35], [35, 30], [32, 25], [30, 25]
      ],
      // Australia
      [
        [-10, 112], [-12, 115], [-15, 118], [-18, 122], [-20, 125], [-22, 128], [-25, 130],
        [-28, 132], [-30, 135], [-32, 138], [-35, 140], [-38, 142], [-40, 145], [-42, 148],
        [-40, 150], [-38, 152], [-35, 155], [-32, 153], [-30, 150], [-28, 148], [-25, 145],
        [-22, 142], [-20, 140], [-18, 135], [-15, 132], [-12, 130], [-10, 125], [-8, 120],
        [-10, 115], [-10, 112]
      ]
    ];
    
    // Create a points material for land dots
    const dotMaterial = new THREE.PointsMaterial({
      color: 0x1af073,
      size: 1.2,
      opacity: 0.8,
      transparent: true,
      sizeAttenuation: true
    });
    
    // Create a denser distribution of points within each landmass
    function createDenseLandDots() {
      const positions = [];
      const allLandCoords = [];
      
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
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      
      const pointCloud = new THREE.Points(geometry, dotMaterial);
      pointCloud.rotation.x = tiltAngle; // Apply same tilt as the globe
      globeGroup.add(pointCloud);
      
      return { pointCloud, allLandCoords };
    }
    
    // Helper: Calculate bounding box for a continent
    function getBoundingBox(continent) {
      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      
      continent.forEach(point => {
        minLat = Math.min(minLat, point[0]);
        maxLat = Math.max(maxLat, point[0]);
        minLon = Math.min(minLon, point[1]);
        maxLon = Math.max(maxLon, point[1]);
      });
      
      return { minLat, maxLat, minLon, maxLon };
    }
    
    // Helper: Calculate grid size based on bounding box
    function calculateGridSize(boundingBox, densityFactor) {
      const width = boundingBox.maxLon - boundingBox.minLon;
      const height = boundingBox.maxLat - boundingBox.minLat;
      const maxDimension = Math.max(width, height);
      
      // This determines point density - smaller number = more points
      return maxDimension / (100 * densityFactor);
    }
    
    // Helper: Check if a point is inside a polygon using ray casting algorithm
    function isPointInPolygon(point, polygon) {
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
    function latLongToVector3(lat, lon, radius) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      
      const x = -radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      return new THREE.Vector3(x, y, z);
    }
    
    // Create land dots
    const { pointCloud: landDots, allLandCoords } = createDenseLandDots();
    
    // Select a random target point from land coordinates
    const getRandomTargetPoint = () => {
      const randomIndex = Math.floor(Math.random() * allLandCoords.length);
      const targetLatLon = allLandCoords[randomIndex];
      const targetPosition = latLongToVector3(targetLatLon[0], targetLatLon[1], globeRadius);
      
      // Create a visible target marker
      const targetMarker = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff3366 })
      );
      targetMarker.position.copy(targetPosition);
      targetMarker.rotation.x = tiltAngle; // Apply tilt to marker
      globeGroup.add(targetMarker);
      
      // Create a pulsing effect for the target
      const pulsingLight = new THREE.PointLight(0xff3366, 1, 20);
      pulsingLight.position.copy(targetPosition);
      globeGroup.add(pulsingLight);
      
      // Create a glow sphere
      const glowSphere = new THREE.Mesh(
        new THREE.SphereGeometry(4, 16, 16),
        new THREE.MeshBasicMaterial({ 
          color: 0xff3366,
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
    
    // Set the single target for all connections
    const target = getRandomTargetPoint();
    
    // Active connections lines
    const connections = [];
    const maxConnections = 25;
    
    // Function to create a new connection to the single target
    function createConnection() {
      if (connections.length >= maxConnections) return;
      
      // Get random start point but fixed end point
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
      const midPoint = new THREE.Vector3().addVectors(startPosition, endPosition).multiplyScalar(0.5);
      
      // Push midpoint outward
      const midPointLength = midPoint.length();
      midPoint.normalize().multiplyScalar(midPointLength * 1.3);
      
      // Create curve
      const curve = new THREE.QuadraticBezierCurve3(
        startPosition,
        midPoint,
        endPosition
      );
      
      // Create curve points
      const curvePoints = curve.getPoints(50);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([curvePoints[0], curvePoints[0]]);
      
      // Create line material - blue for all connections
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x3a86ff,
        transparent: true,
        opacity: 0.6
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      globeGroup.add(line);
      
      // Create moving dot
      const dotGeometry = new THREE.SphereGeometry(1, 8, 8);
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: 0x3a86ff,
        transparent: true,
        opacity: 0.9
      });
      
      const movingDot = new THREE.Mesh(dotGeometry, dotMaterial);
      movingDot.position.copy(startPosition);
      globeGroup.add(movingDot);
      
      connections.push({
        line,
        movingDot,
        curve,
        points: curvePoints,
        progress: 0,
        totalPoints: curvePoints.length,
        duration: 2 + Math.random() * 3, // Random duration between 2-5 seconds
        startTime: Date.now(),
        complete: false
      });
    }
    
    // Update connections
    function updateConnections() {
      const now = Date.now();
      const connectionsToRemove = [];
      
      connections.forEach((connection, index) => {
        const elapsedTime = (now - connection.startTime) / 1000;
        connection.progress = Math.min(elapsedTime / connection.duration, 1);
        
        // Calculate current point index
        const pointIndex = Math.floor(connection.progress * (connection.totalPoints - 1));
        
        // Update line geometry to draw up to current point
        const linePoints = connection.points.slice(0, pointIndex + 1);
        connection.line.geometry.dispose();
        connection.line.geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        
        // Update moving dot position
        if (pointIndex < connection.totalPoints) {
          connection.movingDot.position.copy(connection.points[pointIndex]);
        }
        
        // Mark completed connections
        if (connection.progress >= 1) {
          connection.complete = true;
          // Remove after a short delay to show the full path briefly
          setTimeout(() => {
            connectionsToRemove.push(index);
          }, 200);
        }
      });
      
      // Remove completed connections
      for (let i = connectionsToRemove.length - 1; i >= 0; i--) {
        const index = connectionsToRemove[i];
        const connection = connections[index];
        globeGroup.remove(connection.line);
        globeGroup.remove(connection.movingDot);
        connections.splice(index, 1);
      }
      
      // Create new connections periodically
      if (Math.random() < 0.05) {
        createConnection();
      }
      
      // Pulse the target
      const pulseScale = 1 + 0.2 * Math.sin(Date.now() * 0.005);
      target.glow.scale.set(pulseScale, pulseScale, pulseScale);
      target.light.intensity = 1 + 0.5 * Math.sin(Date.now() * 0.005);
    }
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Rotation settings
    let rotationSpeed = 0.0005;
    
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
    
    setIsLoading(false);
    
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
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-[var(--background)]">
      <div className="w-full absolute top-0">
        <nav className="py-8 px-8 max-w-[1200px] m-auto font-medium">API Analytics for NGINX</nav>
      </div>
      <h1 className="w-full text-center text-white pt-[53.5vh] font-bold text-3xl">It&apos;s you versus the world.</h1>

      <div ref={mountRef} className="w-full h-full absolute top-[50vh] overflow-hidden" />
      
      <div className="absolute top-[92vh] w-full grid place-items-center">
        <div className="w-fit bg-[var(--background)] rounded p-2 border border-[#ffffff13] flex gap-3">
          <button className="bg-[var(--highlight)] rounded p-4 py-2 w-[130px] text-black">Get Started</button>
          <button className="rounded p-4 bg-[#ffffff1d] w-[130px] py-2">Demo</button>
        </div>

      </div>
    </div>
  );
}