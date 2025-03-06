import PasswordForm from '@/lib/components/password-form';
import { redirect } from 'next/navigation';

export default function Home() {
	// Check if the password is set at the server level
	const password = process.env.NGINX_ANALYTICS_PASSWORD;

	if (!password) {
		// Redirect to /dashboard if the password is not set
		redirect('/dashboard');
	}

	return (
		<PasswordForm />
	);
}
