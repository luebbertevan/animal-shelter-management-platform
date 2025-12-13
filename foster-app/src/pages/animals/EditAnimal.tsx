import { useParams, useNavigate } from "react-router-dom";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import NavLinkButton from "../../components/ui/NavLinkButton";

// Placeholder component - will be implemented in Animal Editing for Coordinators milestone
export default function EditAnimal() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { isCoordinator } = useProtectedAuth();

	// Redirect non-coordinators
	if (!isCoordinator) {
		navigate("/animals", { replace: true });
		return null;
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-4xl mx-auto">
				<div className="mb-6">
					<NavLinkButton
						to={id ? `/animals/${id}` : "/animals"}
						label="Back to Animal"
					/>
				</div>
				<div className="bg-white rounded-lg shadow-sm p-6">
					<h1 className="text-2xl font-bold text-gray-900 mb-4">
						Edit Animal
					</h1>
					<p className="text-gray-600">
						Edit functionality coming soon. This will be implemented
						in the Animal Editing for Coordinators milestone.
					</p>
				</div>
			</div>
		</div>
	);
}

