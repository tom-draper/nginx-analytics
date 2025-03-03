import { Data } from "../types";

export default function Users({ data }: {data: Data}) {
    console.log(data);
    return (
        <div className="border rounded border-gray-300 flex-1 px-4 py-3 m-2">
            <h2 className="font-semibold">
                Users
            </h2>

            <div className="text-3xl font-semibold grid place-items-center">
                <div className="py-6">

                </div>
            </div>
        </div>
    )
}