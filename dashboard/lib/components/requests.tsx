import { Data } from "../types";

export function Requests({ data }: { data: Data }) {
    return (
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
    )
}