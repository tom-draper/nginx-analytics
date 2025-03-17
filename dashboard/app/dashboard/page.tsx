import Dashboard from "@/lib/components/dashboard";

export default function Home() {
    const fileUpload = !process.env.NGINX_ACCESS_PATH && !process.env.NGINX_ERROR_PATH && !process.env.NGINX_ACCESS_URL && !process.env.NGINX_ERROR_URL;

    return <Dashboard fileUpload={fileUpload} />
}
