'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function NetworkBackground() {
    const svgRef = useRef(null);

    useEffect(() => {
        // Clear any existing SVG content
        d3.select(svgRef.current).selectAll("*").remove();

        // Set up the SVG container
        const width = window.innerWidth;
        const height = window.innerHeight;
        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height);

        // Generate random nodes
        const nodeCount = 30;
        const nodes = Array.from({ length: nodeCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 3 + 1, // Random radius between 2-5
        }));

        // Generate random links (connections between nodes)
        const links: { source: number, target: number }[] = [];
        nodes.forEach((source, i) => {
            nodes.forEach((target, j) => {
                if (i !== j && Math.random() < 0.02) {
                    links.push({ source: i, target: j });
                }
            });
        });

        // Create the force simulation
        const simulation = d3.forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-30))
            .force("link", d3.forceLink(links).distance(100).strength(0.1))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.r * 2));

        // Draw the links
        const link = svg.append("g")
            .attr("stroke", "rgba(26, 240, 115, 0.4)")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line");

        // Draw the nodes
        const node = svg.append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", d => d.r)
            .attr("fill", "rgba(26, 240, 115, 1)")
            // @ts-expect-error err
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Add subtle glow effect
        node.append("title")
            .text(d => "Drag me!");

        // Add subtle animations
        function animate() {
            node.attr("r", d => {
                d.r = (3 + Math.sin(Date.now() * 0.001 + d.x));
                return d.r;
            });
            requestAnimationFrame(animate);
        }
        animate();

        // Update the positions on each tick of the simulation
        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

        // Handle window resizing
        function handleResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            svg.attr("width", width).attr("height", height);
            simulation.force("center", d3.forceCenter(width / 2, height / 2));
            simulation.alpha(1).restart();
        }

        window.addEventListener("resize", handleResize);

        // Drag functions
        function dragstarted(event: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event: any) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event: any) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }

        // Clean up
        return () => {
            window.removeEventListener("resize", handleResize);
            simulation.stop();
        };
    }, []);

    return (
        <svg
            ref={svgRef}
            className="absolute inset-0"
        />
    );
}