'use client';

export default function FileUpload() {
  return (
    <div className="flex items-center justify-center p-4 pb-[10vh]">
      <div className="w-md bg-opacity-80 backdrop-blur-sm border border-[var(--border-color)] rounded shadow-lg overflow-hidden">
        <div className="p-8 pointer-events-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 mb-4">
              <img src="logo.svg" alt="Nginx Analytics Logo" className="h-14" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Nginx Analytics</h1>
            {/* <p className="mt-2 text-gray-500 dark:text-gray-400 text-center">Please enter your password to access the dashboard</p> */}
          </div>

        </div>
      </div>
    </div>
  );
}