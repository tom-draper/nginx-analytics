import { Data } from "../types";

export function Version({ data }: { data: Data }) {
    return (
        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
            <h2 className="font-semibold">
                Version
            </h2>

            <div className="pb-50">
                Context
            </div>
        </div>
    )
}