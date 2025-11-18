import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function Dashboard() {
	const navigate = useNavigate();
	const { user, loading } = useAuth();

	const handleLogout = async () => {
		const { error } = await supabase.auth.signOut();

		if (error) {
			console.error("Error signing out:", error);
		}

		// Always redirect - local session is cleared regardless of network errors
		navigate("/login", { replace: true });
	};

	if (loading) {
		return (
			<div className="min-h-screen p-4 bg-gray-50 flex items-center justify-center">
				<LoadingSpinner message="Loading dashboard..." />
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="bg-white rounded-lg shadow-md p-6 mb-4">
					<div className="flex justify-between items-center mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Dashboard
							</h1>
							{user && (
								<p className="text-sm text-gray-600 mt-1">
									Signed in as {user.email}
								</p>
							)}
						</div>
					</div>
					<p className="text-gray-600">Dashboard coming soon...</p>
				</div>

				<div className="bg-white rounded-lg shadow-md p-6 mb-4">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Quick Actions
					</h2>
					<div className="space-y-4">
						<Link to="/animals" className="block">
							<Button>View Animals</Button>
						</Link>
						<Link to="/animals/new" className="block">
							<Button>Create New Animal</Button>
						</Link>
					</div>
				</div>

				<div className="bg-white rounded-lg shadow-md p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Account
					</h2>
					<Button variant="outline" onClick={handleLogout}>
						Log out
					</Button>
				</div>
			</div>
		</div>
	);
}
