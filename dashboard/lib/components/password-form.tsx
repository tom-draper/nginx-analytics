'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function PasswordForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState(false);  // Track if there was an input error
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // On successful login, set the auth cookie and redirect to dashboard
        document.cookie = 'auth=true; path=/; max-age=604800';  // Set the auth cookie for 7 days
        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid password');
        setInputError(true); // Set inputError to true for the animation
        setTimeout(() => setInputError(false), 1000); // Reset inputError after 1 second
      }
    } catch (error) {
      setError('An error occurred while submitting the password.');
    }
  };

  return (
    <div className="grid place-items-center min-h-[70vh]">
      <div>
        <form onSubmit={handleSubmit}>
          <div className="grid place-items-center pb-16">
            <Image src="/icon.svg" alt="Icon" width={96} height={96} />
            <div className="mt-4 font-medium text-[var(--other-green)]">Nginx Analytics</div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`rounded border  border-gray-300 px-2 w-60 py-1 mr-2 ${inputError ? 'border-red-500 text-red-500 animate-shake' : ''}`}
            placeholder="Enter password"
          />
          <button type="submit" className="bg-[var(--other-green)] cursor-pointer text-white px-4 py-1 rounded">Submit</button>
        </form>
      </div>
    </div>
  );
}
