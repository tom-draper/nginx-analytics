import { Period } from "../period";

export function Navigation({ filterPeriod, setFilterPeriod, setShowSettings, isDemo }: { filterPeriod: Period, setFilterPeriod: (period: Period) => void, setShowSettings: any, isDemo: boolean }) {
    const showSettings = () => {
        setShowSettings(true);
    }

    return (
        <nav className="mb-1 flex">

            <div className="flex flex-grow">
                {isDemo && (
                    <div className="hidden min-[750px]:flex border rounded-[var(--border-radius)] border-[var(--border-color)] text-[0.9em] text-[var(--text-muted3)] overflow-hidden ml-3">
                        <a
                            href="https://github.com/tom-draper/nginx-analytics"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group px-3 py-1 hover:text-[var(--text)] cursor-pointer transition-colors duration-200 ease-in-out flex items-center"
                        >
                            Get started
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="size-6 h-[18px] my-auto ml-[6px] transition-transform duration-300 ease-in-out group-hover:translate-x-[2px] group-hover:transition-colors group-hover:delay-300 group-hover:stroke-[var(--highlight)]"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"></path>
                            </svg>
                        </a>
                    </div>
                )}
            </div>

            <div className="mx-3 flex flex-end justify-end">
                <div className="text-sm grid place-items-center text-[var(--text-muted3)] px-2 font-semibold">
                    <a
                        target="_blank"
                        href="https://www.buymeacoffee.com/tomdraper"
                        className="hover:text-[var(--highlight)]">Donate</a>
                </div>
                <div className="grid place-items-center px-2 pr-4">
                    <button className="cursor-pointer" onClick={showSettings}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-gear-fill text-[var(--text-muted3)] hover:text-[var(--highlight)]" viewBox="0 0 16 16">
                            <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                        </svg>

                    </button>
                </div>
                <div className="border rounded-[var(--border-radius)] border-[var(--border-color)] text-[0.9em] text-[var(--text-muted3)] overflow-hidden ">
                    <button className={`px-3 py-1 hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out ${filterPeriod === '24 hours' ? 'bg-[var(--highlight)] !text-black' : ''}`} onClick={() => setFilterPeriod('24 hours')}>
                        24 hours
                    </button>
                    <button className={`px-3 py-1 hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out ${filterPeriod === 'week' ? 'bg-[var(--highlight)] !text-black' : ''}`} onClick={() => setFilterPeriod('week')}>
                        Week
                    </button>
                    <button className={`px-3 py-1 hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out ${filterPeriod === 'month' ? 'bg-[var(--highlight)] !text-black' : ''}`} onClick={() => setFilterPeriod('month')}>
                        Month
                    </button>
                    <button className={`px-3 py-1 hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out ${filterPeriod === '6 months' ? 'bg-[var(--highlight)] !text-black' : ''}`} onClick={() => setFilterPeriod('6 months')}>
                        6 months
                    </button>
                    <button className={`px-3 py-1 hover:text-[var(--text)] cursor-pointer transition-colors duration-50 ease-in-out ${filterPeriod === 'all time' ? 'bg-[var(--highlight)] !text-black' : ''}`} onClick={() => setFilterPeriod('all time')}>
                        All time
                    </button>
                </div>
            </div>
        </nav>
    );
}