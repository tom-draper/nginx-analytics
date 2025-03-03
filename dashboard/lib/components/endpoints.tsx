import { Data } from "../types";

export function Endpoints({ data }: { data: Data }) {
    console.log(data);
    return (
        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
            <h2 className="font-semibold">
                Endpoints
            </h2>

            <div className="pb-160">
                Content
            </div>
        </div>
    )
}