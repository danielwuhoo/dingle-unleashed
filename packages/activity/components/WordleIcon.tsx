import classes from '@/app/page.module.css';

const PATTERN = [
    ['surface', 'present', 'surface'],
    ['surface', 'present', 'surface'],
    ['correct', 'present', 'correct'],
];

export default function WordleIcon() {
    const size = 120;
    const gap = 6;
    const cellSize = (size - gap * 4) / 3;

    return (
        <svg className={classes.icon} viewBox={`0 0 ${size} ${size}`}>
            <rect width={size} height={size} rx={12} fill="none" stroke="var(--color-border)" strokeWidth={3} />
            {PATTERN.map((row, r) =>
                row.map((type, c) => {
                    const fill = type === 'correct'
                        ? 'var(--color-correct)'
                        : type === 'present'
                            ? 'var(--color-present)'
                            : 'var(--color-border)';
                    return (
                        <rect
                            key={`${r}-${c}`}
                            x={gap + c * (cellSize + gap)}
                            y={gap + r * (cellSize + gap)}
                            width={cellSize}
                            height={cellSize}
                            rx={4}
                            fill={fill}
                        />
                    );
                })
            )}
        </svg>
    );
}
