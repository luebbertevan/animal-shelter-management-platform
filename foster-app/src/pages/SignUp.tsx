import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getErrorMessage, checkOfflineAndThrow } from "../lib/errorUtils";
import FormContainer from "../components/ui/FormContainer";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import ErrorMessage from "../components/ui/ErrorMessage";
import Toggle from "../components/ui/Toggle";

export default function SignUp() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [isCoordinator, setIsCoordinator] = useState(false);
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
			// Check if we're offline before making the request
			checkOfflineAndThrow();

			const { data, error: signUpError } = await supabase.auth.signUp({
				email: email.trim(),
				password: password,
				options: {
					data: {
						full_name: name.trim() || null,
						role: isCoordinator ? "coordinator" : "foster",
					},
				},
			});

			if (signUpError) {
				setError(
					getErrorMessage(
						signUpError,
						"Sign up failed. Please try again."
					)
				);
			} else if (data.session) {
				// Session is available immediately in the response - user is automatically logged in
				navigate("/dashboard", { replace: true });
			} else {
				// No session (shouldn't happen with email confirmation disabled, but handle gracefully)
				navigate("/login", { replace: true });
			}
		} catch (err) {
			setError(
				getErrorMessage(
					err,
					"An unexpected error occurred. Please try again."
				)
			);
		} finally {
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
					label="Name"
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					disabled={loading}
					placeholder="Enter your name"
				/>

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

				<Toggle
					label="Coordinator"
					checked={isCoordinator}
					onChange={setIsCoordinator}
					disabled={loading}
				/>

				{error && <ErrorMessage>{error}</ErrorMessage>}

				<Button type="submit" disabled={loading}>
					{loading ? "Creating account..." : "Sign up"}
				</Button>
			</form>
		</FormContainer>
	);
}
