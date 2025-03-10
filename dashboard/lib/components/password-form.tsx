'use client';

import { useState } from 'react';
// import Image from 'next/image';
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
    <div className="grid place-items-center min-h-[80vh]">
      <div>
        <form onSubmit={handleSubmit}>
          <div className="grid place-items-center pb-16 text-[var(--highlight)]">
            {/* <Image src="/icon.svg" alt="Icon" width={96} height={96} /> */}

            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" className="h-24">
              <path d="M150 10 
L270 75
L270 185
L150 250
L30 185
L30 75
Z"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinejoin="round" />

              <path d="M30 185
L90 130
L210 130
L270 75
L270 185
L150 250
L30 185
Z"
                fill="currentColor"
                fillOpacity="0.5"
                stroke="none" />

              <path d="M30 185
L90 130
L210 130
L270 75"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinejoin="round" />
            </svg>
            <div className="mt-4 text-[var(--highlight)] font-semibold">Nginx Analytics</div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`rounded border  border-gray-300 px-2 w-60 py-1 mr-2 ${inputError ? 'border-red-500 text-red-500 animate-shake' : ''}`}
            placeholder="Enter password"
          />
          <button type="submit" className="bg-[var(--highlight)] cursor-pointer text-[var(--text)] px-4 py-1 rounded">Submit</button>
        </form>
      </div>
    </div>
  );
}
