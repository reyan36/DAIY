"use client";

/**
 * DAIY Logo Component
 *
 * Renders the DAIY logo as an SVG with optional orbiting dot animation.
 * - Static: Circle with center dot (matches the large logo)
 * - Animated: Circle with a dot that orbits around the inside perimeter
 *
 * Props:
 *   size     — pixel size (default 32)
 *   animate  — whether the inner dot should orbit (for AI responding state)
 *   className — optional extra CSS classes
 */

interface DaiyLogoProps {
    size?: number;
    animate?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

export default function DaiyLogo({ size = 32, animate = false, className = "", style }: DaiyLogoProps) {
    const strokeWidth = size * 0.07;   // proportional stroke
    const center = size / 2;
    const radius = center - strokeWidth; // circle radius
    const dotRadius = size * 0.07;      // the inner dot size
    const orbitRadius = radius * 0.55;   // how far the dot orbits from center

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            className={`daiy-logo ${animate ? "daiy-logo-active" : ""} ${className}`}
            style={style}
        >
            {/* Outer circle */}
            <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                fill="none"
                className={animate ? "daiy-logo-ring" : ""}
            />

            {/* Center dot — static when not animating */}
            {!animate && (
                <circle
                    cx={center}
                    cy={center}
                    r={dotRadius}
                    fill="#10B981"
                />
            )}

            {/* Orbiting dot — only when animating */}
            {animate && (
                <circle
                    cx={center}
                    cy={center - orbitRadius}
                    r={dotRadius}
                    fill="#10B981"
                    className="daiy-logo-dot"
                    style={{
                        transformOrigin: `${center}px ${center}px`,
                    }}
                />
            )}
        </svg>
    );
}

/**
 * Simplified small version — just the ring (matches small logo).
 * Used where space is tight.
 */
export function DaiyLogoSmall({ size = 20, animate = false, className = "" }: DaiyLogoProps) {
    const strokeWidth = size * 0.09;
    const center = size / 2;
    const radius = center - strokeWidth;
    const dotRadius = size * 0.09;
    const orbitRadius = radius * 0.6;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            fill="none"
            className={`daiy-logo ${animate ? "daiy-logo-active" : ""} ${className}`}
        >
            <circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#10B981"
                strokeWidth={strokeWidth}
                fill="none"
            />
            {animate && (
                <circle
                    cx={center}
                    cy={center - orbitRadius}
                    r={dotRadius}
                    fill="#10B981"
                    className="daiy-logo-dot"
                    style={{
                        transformOrigin: `${center}px ${center}px`,
                    }}
                />
            )}
        </svg>
    );
}
