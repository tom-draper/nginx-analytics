import { type Filter } from "../filter";
import { type Settings } from "../settings";

export function Settings({
    settings,
    setSettings,
    showSettings,
    setShowSettings,
    filter,
    exportCSV,
}: {
    settings: Settings,
    setSettings: any,
    showSettings: boolean,
    setShowSettings: any,
    filter: Filter,
    exportCSV: () => void,
}) {

    const onClose = () => {
        setShowSettings(false);
    }

    const onToggleIgnore404 = (value: boolean) => {
        setSettings((previous: Settings) => ({
            ...previous,
            ignore404: value
        }))
    }

    const onToggleIgnoreParams = (value: boolean) => {
        setSettings((previous: Settings) => ({
            ...previous,
            ignoreParams: value
        }))
    }

    return (
        <>
            {showSettings && (
                <>
                    {/* Blurred backdrop */}
                    < div
                        className="absolute z-40 bg-black/60 backdrop-blur-sm inset-0 transition-opacity cursor-pointer"
                        onClick={onClose}
                    ></div >

                    {/* Settings modal */}
                    < div className="fixed inset-0 z-50 grid place-items-center text-gray-800 dark:text-gray-200 p-4 pointer-events-none" >
                        <div className="border border-[var(--border-color)] rounded-lg bg-[var(--card-background)] shadow-xl w-full max-w-md pointer-events-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
                                <h2 className="text-xl font-semibold">Settings</h2>
                                <button
                                    onClick={exportCSV}
                                    title="Export CSV"
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer focus:outline-none"
                                >
                                    {/* <X size={20} /> */}
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>


                                </button>
                            </div>


                            {/* Content */}
                            <div className="px-6 py-4 space-y-6">

                                {/* Toggle options */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="ignore404" className="font-medium">
                                            Ignore status 404
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="ignore404"
                                                className="sr-only peer"
                                                defaultChecked={settings.ignore404}
                                                onChange={(e) => onToggleIgnore404(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--highlight)] rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--highlight)]"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label htmlFor="ignoreParams" className="font-medium">
                                            Ignore params
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                id="ignoreParams"
                                                className="sr-only peer"
                                                defaultChecked={settings.ignoreParams}
                                                onChange={(e) => onToggleIgnoreParams(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--highlight)] rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--highlight)]"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Filters */}
                                <div className="space-y-3 mb-4">
                                    <h3 className="font-semibold text-md">Active Filters</h3>
                                    <div className="bg-[rgba(26,240,115,0.1)] rounded p-4 space-y-2">
                                        {Object.entries(filter).map(([key, value]) => (
                                            value ? (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="capitalize font-medium">{key}:</span>
                                                    <span className="bg-[var(--highlight)] text-[var(--background)] px-2 py-1 rounded text-sm">{value}</span>
                                                </div>
                                            ) : null
                                        ))}
                                        {!Object.values(filter).some(Boolean) && (
                                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">No active filters</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                </>
            )
            }

        </>
    );
}