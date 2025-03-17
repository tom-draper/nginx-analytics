// app/page.js (Server Component)
import PasswordForm from '@/lib/components/password-form';
import { redirect } from 'next/navigation';
import NetworkBackground from '@/lib/components/network-background';

export default function Home() {
  // Check if the password is set at the server level
  const password = process.env.NGINX_ANALYTICS_PASSWORD;

  if (!password) {
    // Redirect to /dashboard if the password is not set
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