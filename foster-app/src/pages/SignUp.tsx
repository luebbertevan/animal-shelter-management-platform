import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignUp() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		// Client-side validation
		if (password.length < 6) {
			setError("Password must be at least 6 characters long.");
			setLoading(false);
			return;
		}

		if (password !== passwordConfirm) {
			setError("Passwords do not match.");
			setLoading(false);
			return;
		}

		try {
			const { error: signUpError } = await supabase.auth.signUp({
				email: email.trim(),
				password: password,
			});

			if (signUpError) {
				setError(signUpError.message);
				setLoading(false);
			} else {
				// Signup successful - redirect to login
				navigate("/login", { replace: true });
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
			<div className="w-full max-w-sm">
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold mb-2 text-gray-900">
						Sign Up
					</h1>
					<p className="text-gray-600 text-sm mb-6">
						Create a new account
					</p>

					<form onSubmit={handleSignUp} className="space-y-4">
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Email
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Enter your email"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={loading}
								minLength={6}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Enter your password (min. 6 characters)"
							/>
						</div>

						<div>
							<label
								htmlFor="passwordConfirm"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Confirm Password
							</label>
							<input
								id="passwordConfirm"
								type="password"
								value={passwordConfirm}
								onChange={(e) =>
									setPasswordConfirm(e.target.value)
								}
								required
								disabled={loading}
								className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								placeholder="Confirm your password"
							/>
						</div>

						{error && (
							<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? "Creating account..." : "Sign up"}
						</button>
					</form>

					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Already have an account?{" "}
							<Link
								to="/login"
								className="text-blue-600 hover:text-blue-700 font-medium"
							>
								Log in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
