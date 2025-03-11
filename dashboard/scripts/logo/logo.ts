const fs = require('fs');
const xmlbuilder = require('xmlbuilder');

const highlight = 'rgb(26, 240, 115)';
const background = 'currentColor'
const outerRadius = 20
const innerRadius = 12
const strokeWidth = 18

const createPoint = (point: { x: number, y: number }) => {
	const group = xmlbuilder.create('g');

	// Add the outer circle
	group.ele('circle', {
		cx: point.x,
		cy: point.y,
		r: outerRadius,
		fill: highlight
	});

	// Add the inner circle (smaller point)
	group.ele('circle', {
		cx: point.x,
		cy: point.y,
		r: innerRadius,
		fill: background,
	});

	svg.importDocument(group);
}

const createLine = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
	svg.ele('line', {
		x1: p1.x,
		y1: p1.y,
		x2: p2.x,
		y2: p2.y,
		stroke: highlight,
		'stroke-width': strokeWidth
	});
}

const svg = xmlbuilder.create('svg', { version: '1.0', encoding: 'utf-8' })
	.att('xmlns', 'http://www.w3.org/2000/svg')
	.att('width', '350')
	.att('height', '190');

const p1 = { x: 50, y: 160 };
const p2 = { x: 130, y: 60 };
const p3 = { x: 220, y: 130 };
const p4 = { x: p3.x + (p2.x - p1.x), y: p3.y + (p2.y - p1.y) };

createLine(p1, p2)
createLine(p2, p3)
createLine(p3, p4)
createPoint(p1);
createPoint(p2);
createPoint(p3);
createPoint(p4);

const svgString = svg.end({ pretty: true });

console.log(svgString)

fs.writeFileSync('logo.svg', svgString);