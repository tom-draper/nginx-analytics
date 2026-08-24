
import Image from 'next/image'

export function Logo() {
    return (
        <div className="card flex-1 px-4 py-3 m-3 text-[var(--highlight)]">
            <div className="grid place-items-center h-full" title="NGINX Analytics">
                <Image src="/logo.svg" alt="NGINX Analytics" width={56} height={56} className="h-14 w-auto" />
            </div>
        </div>
    )
}
