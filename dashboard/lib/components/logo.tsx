
export function Logo() {
    return (
        <div className="card flex-1 px-4 py-3 m-3 text-[var(--highlight)]">
            <div className="grid place-items-center h-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" className="h-14">
                    <path d="M150 10 
           L270 75
           L270 185
           L150 250
           L30 185
           L30 75
           Z"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinejoin="round" />

                    <path d="M30 185
           L90 130
           L210 130
           L270 75
           L270 185
           L150 250
           L30 185
           Z"
                        fill="currentColor"
                        fillOpacity="0.5"
                        stroke="none" />

                    <path d="M30 185
           L90 130
           L210 130
           L270 75"
                        fill="none"
                        // stroke="#2ECC71"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinejoin="round" />
                </svg>

            </div>
        </div>
    )
}