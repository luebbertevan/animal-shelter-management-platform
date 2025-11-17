import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import FormContainer from "../components/ui/FormContainer";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import ErrorMessage from "../components/ui/ErrorMessage";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const { data, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: email.trim(),
					password: password,
				});

			if (signInError) {
				setError(signInError.message);
				setLoading(false);
			} else if (data.session) {
				// Session is available in the response - login successful
				navigate("/dashboard", { replace: true });
			} else {
				// No session (unexpected - should not happen with signInWithPassword)
				setError("Login failed. Please try again.");
				setLoading(false);
			}
		} catch {
			setError("An unexpected error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<FormContainer
			title="Login"
			subtitle="Sign in to your account"
			footer={
				<div className="text-center">
					<p className="text-sm text-gray-600">
						Don't have an account?{" "}
						<Link
							to="/signup"
							className="text-pink-600 hover:text-pink-700 font-medium"
						>
							Sign up
						</Link>
					</p>
				</div>
			}
		>
			<form onSubmit={handleLogin} className="space-y-4">
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
					placeholder="Enter your password"
				/>

				{error && <ErrorMessage>{error}</ErrorMessage>}

				<Button type="submit" disabled={loading}>
					{loading ? "Logging in..." : "Log in"}
				</Button>
			</form>
		</FormContainer>
	);
}
