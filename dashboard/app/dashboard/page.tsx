import Dashboard from "@/lib/components/dashboard";
import { usingFileUpload } from "@/lib/environment";

export default function Home() {
    return <Dashboard fileUpload={usingFileUpload()} demo={false} />
}
