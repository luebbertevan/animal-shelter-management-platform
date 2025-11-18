import { Link } from "react-router-dom";
import Button from "./Button";

interface NavLinkButtonProps {
	to: string;
	label: string;
	variant?: "primary" | "secondary" | "outline";
}

/**
 * A button that navigates to a route. Used for navigation between pages.
 * Example: <NavLinkButton to="/animals" label="View All Animals" />
 */
export default function NavLinkButton({
	to,
	label,
	variant = "outline",
}: NavLinkButtonProps) {
	return (
		<Link to={to} className="block">
			<Button variant={variant}>{label}</Button>
		</Link>
	);
}
