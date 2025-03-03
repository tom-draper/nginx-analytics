import { parseLogs } from "@/lib/parse";

export default function Home() {
  const logs = [
    `192.168.1.101 - - [03/Mar/2025:12:34:56 +0000] "GET /index.html HTTP/1.1" 200 1024 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"`,
    `203.0.113.42 - - [03/Mar/2025:12:35:02 +0000] "POST /login HTTP/1.1" 302 256 "https://example.com/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"`,
    `198.51.100.24 - - [03/Mar/2025:12:35:20 +0000] "GET /about-us HTTP/1.1" 200 1342 "https://example.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"`,
    `192.168.1.102 - - [03/Mar/2025:12:36:01 +0000] "GET /api/data HTTP/1.1" 404 523 "https://example.com/dashboard" "Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36"`,
    `203.0.113.99 - - [03/Mar/2025:12:36:45 +0000] "GET /images/logo.png HTTP/1.1" 304 0 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"`,
    `192.168.1.103 - - [03/Mar/2025:12:37:15 +0000] "GET /assets/styles.css HTTP/1.1" 200 2048 "https://example.com/contact" "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:45.0) Gecko/20100101 Firefox/45.0"`,
    `198.51.100.99 - - [03/Mar/2025:12:38:32 +0000] "GET /docs/overview.pdf HTTP/1.1" 200 3072 "https://example.com/resources" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36"`,
    `203.0.113.67 - - [03/Mar/2025:12:38:58 +0000] "POST /checkout HTTP/1.1" 503 128 "https://example.com/cart" "Mozilla/5.0 (Linux; Android 11; Galaxy S20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36"`,
    `192.168.1.104 - - [03/Mar/2025:12:39:13 +0000] "GET / HTTP/1.1" 200 5148 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"`,
    `203.0.113.45 - - [03/Mar/2025:12:40:25 +0000] "GET /404 HTTP/1.1" 404 256 "https://example.com/" "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"`
  ]

  const data = parseLogs(logs);

  return (
    <div className="">
      <main className="p-12 pt-7">
        <nav className="mb-1">
          <div className="mx-2 flex flex-end justify-end">
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
        <div className="flex">
          {/* Left */}
          <div className="w-[40em]">
            <div className="flex">

              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <div className="grid place-items-center h-full">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" className="h-16">
                    <path d="M150 10 
           L270 75
           L270 185
           L150 250
           L30 185
           L30 75
           Z"
                      fill="transparent"
                      stroke="#2ECC71"
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
                      fill="#2ECC71"
                      fillOpacity="0.5"
                      stroke="none" />

                    <path d="M30 185
           L90 130
           L210 130
           L270 75"
                      fill="none"
                      // stroke="#2ECC71"
                      stroke="#2ECC71"
                      strokeWidth="8"
                      strokeLinejoin="round" />
                  </svg>

                </div>
              </div>

              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Success Rate
                </h2>

                <div className="text-3xl font-semibold grid place-items-center">
                  <div className="py-6">
                    96.7%
                  </div>
                </div>
              </div>

            </div>

            <div className="flex">

              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Requests
                </h2>

                <div className="text-3xl font-semibold grid place-items-center">
                  <div className="py-6">
                    {data.length}
                  </div>
                </div>
              </div>

              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Users
                </h2>

                <div className="text-3xl font-semibold grid place-items-center">
                  <div className="py-6">

                  </div>
                </div>
              </div>

            </div>

            <div className="flex">
              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Endpoints
                </h2>

                <div className="pb-160">
                  Content
                </div>
              </div>
            </div>

            <div className="flex">
              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Version
                </h2>

                <div className="pb-50">
                  Context
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="w-full">
            <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
              <h2 className="font-semibold">
                Activity
              </h2>

              <div className="pb-120">
                Content
              </div>
            </div>

            <div className="w-full flex">
              <div className="border rounded border-gray-300 flex-2 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Location
                </h2>

                <div className="pb-50">
                  Content
                </div>
              </div>

              <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
                <h2 className="font-semibold">
                  Device
                </h2>

                <div className="pb-50">
                  Content
                </div>
              </div>
            </div>

            <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
              <h2 className="font-semibold">
                Usage Time
              </h2>

              <div className="pb-120">
                Content
              </div>
            </div>

          </div>
        </div>

      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">

      </footer>
    </div>
  );
}
