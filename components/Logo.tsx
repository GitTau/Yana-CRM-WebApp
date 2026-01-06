import React from 'react';

export const YanaLogo: React.FC<{ className?: string; loading?: boolean }> = ({ className, loading }) => {
    // Brand Colors
    const cyan = "#00EAFF"; 
    const dark = "#0F172A"; 
    const strokeWidth = 8;
    
    return (
        <svg 
            viewBox="0 0 200 200" 
            className={className} 
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
        >
            <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00EAFF" />
                    <stop offset="100%" stopColor="#008C9D" />
                </linearGradient>
            </defs>
            
            {/* Loading Spinner Ring - Only visible when loading */}
            {loading && (
                <g className="animate-spin origin-center" style={{ transformBox: 'fill-box' }}>
                    <circle 
                        cx="100" 
                        cy="100" 
                        r="90" 
                        stroke="url(#brandGradient)"
                        strokeWidth="6" 
                        strokeLinecap="round" 
                        strokeDasharray="100 360"
                        className="opacity-100"
                    />
                     <circle 
                        cx="100" 
                        cy="100" 
                        r="90" 
                        stroke={cyan}
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        className="opacity-20"
                    />
                </g>
            )}

            {/* Logo Text Group */}
            <g transform="translate(0, 0)"> 
                
                {/* Letter Y */}
                <path 
                    d="M 20 75 V 95 Q 20 115 35 115 Q 50 115 50 95 V 75 M 35 115 V 130" 
                    stroke={cyan} 
                    strokeWidth={strokeWidth} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />

                {/* Letter A (with +) */}
                <path 
                    d="M 65 130 V 95 Q 65 75 80 75 Q 95 75 95 95 V 130" 
                    stroke={cyan} 
                    strokeWidth={strokeWidth} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
                <path 
                    d="M 72 105 H 88 M 80 97 V 113" 
                    stroke={dark} 
                    strokeWidth={strokeWidth - 2} 
                    strokeLinecap="round" 
                />

                {/* Letter N */}
                <path 
                    d="M 110 130 V 75 L 140 130 V 75" 
                    stroke={cyan} 
                    strokeWidth={strokeWidth} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />

                {/* Letter A (with -) */}
                <path 
                    d="M 155 130 V 95 Q 155 75 170 75 Q 185 75 185 95 V 130" 
                    stroke={cyan} 
                    strokeWidth={strokeWidth} 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
                <path 
                    d="M 162 105 H 178" 
                    stroke={dark} 
                    strokeWidth={strokeWidth - 2} 
                    strokeLinecap="round" 
                />
            </g>
        </svg>
    );
};