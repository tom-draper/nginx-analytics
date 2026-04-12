import { memo } from "react";

const WIDTH = 100;
const HEIGHT = 40;

// Consolidate an array of numbers into at most 6 buckets by summing each chunk.
export function consolidateTo6(values: number[]): number[] {
    if (values.length <= 6) return values;
    const size = Math.ceil(values.length / 6);
    const result: number[] = [];
    for (let i = 0; i < values.length; i += size) {
        result.push(values.slice(i, i + size).reduce((s, v) => s + v, 0));
    }
    return result;
}

export default memo(function TrendGraph({ values, color = 'var(--highlight)' }: {
    values: number[];
    color?: string;
}) {
    if (!values.length) return null;

    const maxVal = Math.max(...values, 1);
    let d: string;

    if (values.length === 1) {
        d = `M 0,${HEIGHT} C 20,${HEIGHT} 30,${HEIGHT * 0.8} 40,${HEIGHT * 0.2} C 45,0 55,0 60,${HEIGHT * 0.2} C 70,${HEIGHT * 0.8} 80,${HEIGHT} 100,${HEIGHT} Z`;
    } else if (values.length === 2) {
        const y1 = HEIGHT - (values[0] / maxVal) * HEIGHT;
        const y2 = HEIGHT - (values[1] / maxVal) * HEIGHT;
        d = `M 0,${HEIGHT} L 0,${y1} C 25,${y1} 25,${y2} 50,${y2} C 75,${y2} 75,${HEIGHT} 100,${HEIGHT} Z`;
    } else {
        const pts = values.map((v, i) => [
            (i / (values.length - 1)) * WIDTH,
            HEIGHT - (v / maxVal) * HEIGHT,
        ]);
        d = `M 0,${HEIGHT} L 0,${pts[0][1]}`;
        for (let i = 1; i < pts.length; i++) {
            const [px, py] = pts[i - 1];
            const [cx, cy] = pts[i];
            const cp1x = px + (cx - px) / 3;
            const cp2x = px + 2 * (cx - px) / 3;
            d += ` C ${cp1x},${py} ${cp2x},${cy} ${cx},${cy}`;
        }
        d += ` L ${WIDTH},${HEIGHT} Z`;
    }

    return (
        <svg
            className="absolute bottom-0 left-0 w-full h-6"
            preserveAspectRatio="none"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
            <path d={d} fill={color} stroke="none" />
        </svg>
    );
})
