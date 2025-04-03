'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasswordForm() {
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [inputError, setInputError] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);
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
				// document.cookie = 'auth=true; path=/; max-age=604800';
				router.push('/dashboard');
			} else {
				setError(data.message || 'Invalid password');
				setInputError(true);
				setTimeout(() => setInputError(false), 1000);
				setIsLoading(false);
			}
		} catch {
			setError('An error occurred while submitting the password.');
			setIsLoading(false);
		}
	};

	return (
		<div className="flex items-center justify-center p-4 pb-[10vh]">
			<div className="w-md bg-opacity-80 backdrop-blur-sm border border-[var(--border-color)] rounded shadow-lg overflow-hidden">
				<div className="p-8 pointer-events-auto">
					<div className="flex flex-col items-center mb-8">
						<div className="p-3 mb-4">
							<img src="logo.svg" alt="Nginx Analytics Logo" className="h-14" />
						</div>
						<h1 className="text-xl font-bold text-gray-800 dark:text-white">Nginx Analytics</h1>
						{/* <p className="mt-2 text-gray-500 dark:text-gray-400 text-center">Please enter your password to access the dashboard</p> */}
					</div>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<div className="relative">
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className={`w-full px-4 py-3 rounded border border-[var(--border-color)] text-sm ${inputError
										? 'border-red-500 animate-shake dark:border-red-500'
										: 'border-[var(--border-color)]'
										} bg-[var(--card-background)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--highlight)] transition-all`}
									placeholder="Enter password"
									required
								/>
							</div>
							{error && (
								<p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
							)}
						</div>
						<button
							type="submit"
							disabled={isLoading}
							className="w-full text-sm flex justify-center items-center py-3 px-4 bg-[var(--highlight)] text-[var(--background)] font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-70 cursor-pointer"
						>
							{isLoading ? (
								<svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
							) : null}
							{isLoading ? "Authenticating..." : "Sign In"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}