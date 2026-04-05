import classes from '@/app/page.module.css';

const GREEN = '#a6da95';
const YELLOW = '#eed49f';
const SURFACE = '#5b6078';

const COLORS = [
    [SURFACE, YELLOW, SURFACE],
    [SURFACE, YELLOW, SURFACE],
    [GREEN, YELLOW, GREEN],
];

export default function WordleIcon() {
    const size = 120;
    const gap = 6;
    const cellSize = (size - gap * 4) / 3;

    return (
        <svg className={classes.icon} viewBox={`0 0 ${size} ${size}`}>
            <rect width={size} height={size} rx={12} fill="none" stroke={SURFACE} strokeWidth={3} />
            {COLORS.map((row, r) =>
                row.map((color, c) => (
                    <rect
                        key={`${r}-${c}`}
                        x={gap + c * (cellSize + gap)}
                        y={gap + r * (cellSize + gap)}
                        width={cellSize}
                        height={cellSize}
                        rx={4}
                        fill={color}
                    />
                ))
            )}
        </svg>
    );
}
