
export function Navigation() {
    return (
        <nav className="mb-1">
            <div className="mx-2 flex flex-end justify-end">
                <div className="text-sm grid place-items-center text-gray-600 px-2 hover:text-[var(--other-green)]">
                    <a href="">Donate</a>
                </div>
                <div className="grid place-items-center px-2 pr-4">
                    <button className="cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-gear-fill text-gray-600 hover:text-[var(--other-green)]" viewBox="0 0 16 16">
                            <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                        </svg>

                    </button>
                </div>
                <div className="border rounded border-gray-300 text-[0.9em]">
                    <button className="px-3 py-1 hover:bg-[var(--other-green)] bg-opacity-10 cursor-pointer">
                        24 hours
                    </button>
                    <button className="px-3 py-1 hover:bg-[var(--other-green)] bg-opacity-10 cursor-pointer">
                        Week
                    </button>
                    <button className="px-3 py-1 hover:bg-[var(--other-green)] bg-opacity-10 cursor-pointer">
                        Month
                    </button>
                    <button className="px-3 py-1 hover:bg-[var(--other-green)] bg-opacity-10 cursor-pointer">
                        6 months
                    </button>
                    <button className="px-3 py-1 hover:bg-[var(--other-green)] bg-opacity-10 cursor-pointer">
                        All time
                    </button>
                </div>
            </div>
        </nav>
    );
}