import PasswordForm from '@/lib/components/password-form';
import { redirect } from 'next/navigation';
import NetworkBackground from '@/lib/components/network-background';
import { password, usingFileUpload } from '@/lib/environment';

export default function Home() {
  if (!password || usingFileUpload) {
    redirect('/dashboard');
  }

  return (
    <div className="relative w-full h-screen bg-[var(--background)]">
      <NetworkBackground />
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <PasswordForm />
      </div>
    </div>
  );
}