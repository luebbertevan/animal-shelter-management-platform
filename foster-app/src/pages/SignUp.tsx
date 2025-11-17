import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import FormContainer from "../components/ui/FormContainer";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import ErrorMessage from "../components/ui/ErrorMessage";

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
			const { data, error: signUpError } = await supabase.auth.signUp({
				email: email.trim(),
				password: password,
			});

			if (signUpError) {
				setError(signUpError.message);
				setLoading(false);
			} else if (data.session) {
				// Session is available immediately in the response - user is automatically logged in
				navigate("/dashboard", { replace: true });
			} else {
				// No session (shouldn't happen with email confirmation disabled, but handle gracefully)
				navigate("/login", { replace: true });
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<FormContainer
			title="Sign Up"
			subtitle="Create a new account"
			footer={
				<div className="text-center">
					<p className="text-sm text-gray-600">
						Already have an account?{" "}
						<Link
							to="/login"
							className="text-pink-600 hover:text-pink-700 font-medium"
						>
							Log in
						</Link>
					</p>
				</div>
			}
		>
			<form onSubmit={handleSignUp} className="space-y-4">
				<Input
					label="Email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					disabled={loading}
					placeholder="Enter your email"
				/>

				<Input
					label="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					disabled={loading}
					minLength={6}
					placeholder="Enter your password (min. 6 characters)"
				/>

				<Input
					label="Confirm Password"
					type="password"
					value={passwordConfirm}
					onChange={(e) => setPasswordConfirm(e.target.value)}
					required
					disabled={loading}
					placeholder="Confirm your password"
				/>

				{error && <ErrorMessage>{error}</ErrorMessage>}

				<Button type="submit" disabled={loading}>
					{loading ? "Creating account..." : "Sign up"}
				</Button>
			</form>
		</FormContainer>
	);
}
