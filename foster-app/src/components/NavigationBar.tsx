import { useNavigate, useLocation, Link } from "react-router-dom";
import {
	HomeIcon,
	ChatBubbleLeftIcon,
	Bars3Icon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import { useProtectedAuth } from "../hooks/useProtectedAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useState, useEffect, useRef } from "react";

async function fetchFosterConversation(userId: string, organizationId: string) {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "foster_chat")
		.eq("foster_profile_id", userId)
		.eq("organization_id", organizationId)
		.maybeSingle();

	if (error) {
		// Log error but don't fail - return null gracefully
		console.error("Error fetching foster conversation:", error);
		return null;
	}

	return data?.id || null;
}

// Helper function to check if a route is active
// Uses exact match or prefix with slash to avoid /fosters matching /fosters-needed
function isRouteActive(pathname: string, to: string): boolean {
	return pathname === to || pathname.startsWith(to + "/");
}

// Helper component for navigation links - background style
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
	const location = useLocation();
	const isActive = isRouteActive(location.pathname, to);

	return (
		<Link
			to={to}
			className={`text-sm sm:text-base md:text-lg font-medium transition-all duration-200 px-3 py-1.5 rounded-md ${
				isActive
					? "text-pink-600 bg-pink-50 font-semibold"
					: "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
			}`}
		>
			{children}
		</Link>
	);
}

// Helper component for dropdown menu links
function MenuNavLink({
	to,
	children,
	onClick,
}: {
	to: string;
	children: React.ReactNode;
	onClick: () => void;
}) {
	const location = useLocation();
	const isActive = isRouteActive(location.pathname, to);

	return (
		<Link
			to={to}
			onClick={onClick}
			className={`block px-4 py-2.5 text-base font-medium transition-colors ${
				isActive
					? "text-pink-600 bg-pink-50"
					: "text-gray-700 hover:text-pink-600 hover:bg-pink-50"
			}`}
		>
			{children}
		</Link>
	);
}

export default function NavigationBar() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, profile, isFoster, isCoordinator } = useProtectedAuth();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Fetch conversation ID only for fosters
	const { data: conversationId } = useQuery<string | null>({
		queryKey: ["fosterConversation", user.id, profile.organization_id],
		queryFn: async () => {
			return fetchFosterConversation(user.id, profile.organization_id);
		},
		enabled: isFoster,
	});

	// Close menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node)
			) {
				setIsMenuOpen(false);
			}
		};

		if (isMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMenuOpen]);

	// Close menu handler
	const handleMenuLinkClick = () => {
		setIsMenuOpen(false);
	};

	const handleChatClick = () => {
		if (isCoordinator) {
			// Coordinators navigate to chat list
			navigate("/chats");
		} else if (isFoster) {
			// Fosters navigate to their household chat
			if (conversationId) {
				navigate(`/chat/${conversationId}`);
			} else {
				// Fallback to chats list if conversation not found
				navigate("/chats");
			}
		}
	};

	return (
		<nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
			<div className="max-w-7xl mx-auto px-3 sm:px-4">
				<div className="flex items-center justify-between h-12 sm:h-16 md:h-20">
					<div className="flex items-center h-full md:py-0.5 gap-2 sm:gap-3 md:gap-4">
						<img
							src="/co_kitty_coalition_logo.avif"
							alt="Co Kitty Coalition"
							className="h-8 sm:h-12 md:h-full md:max-h-full w-auto object-contain"
						/>
						<span className="hidden sm:block text-pink-600 font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl">
							Fosty
						</span>
					</div>

					<div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
						{/* Desktop navigation - hidden on mobile for coordinators */}
						{isFoster ? (
							// Fosters see "Fosters Needed" instead of "Animals" and "Groups"
							<NavLink to="/fosters-needed">
								Fosters Needed
							</NavLink>
						) : (
							// Coordinators see "Animals", "Groups", and "Fosters Needed" on desktop
							<div className="hidden min-[800px]:flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
								<NavLink to="/animals">Animals</NavLink>
								<NavLink to="/groups">Groups</NavLink>
								<NavLink to="/fosters-needed">
									Fosters Needed
								</NavLink>
							</div>
						)}
						{isCoordinator && (
							<div className="hidden min-[800px]:flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
								<NavLink to="/fosters">Fosters</NavLink>
								<NavLink to="/foster-requests">Requests</NavLink>
							</div>
						)}

						<div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 md:ml-4">
							<button
								onClick={() => navigate("/dashboard")}
								className={`flex items-center justify-center p-1.5 sm:p-2 md:p-3 rounded-lg transition-all duration-200 ${
									location.pathname === "/dashboard"
										? "bg-pink-50 text-pink-600"
										: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
								}`}
								aria-label="Home"
							>
								<HomeIcon className="h-5 w-5 md:h-6 md:w-6" />
							</button>

							<button
								onClick={handleChatClick}
								className={`flex items-center justify-center p-1.5 sm:p-2 md:p-3 rounded-lg transition-all duration-200 ${
									location.pathname.startsWith("/chat")
										? "bg-pink-50 text-pink-600"
										: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
								}`}
								aria-label="Chat"
							>
								<ChatBubbleLeftIcon className="h-5 w-5 md:h-6 md:w-6" />
							</button>

							{/* Hamburger menu button - only for coordinators on mobile */}
							{isCoordinator && (
								<div className="min-[800px]:hidden relative" ref={menuRef}>
									<button
										onClick={() => setIsMenuOpen(!isMenuOpen)}
										className={`flex items-center justify-center p-1.5 sm:p-2 md:p-3 rounded-lg transition-all duration-200 ${
											isMenuOpen
												? "bg-pink-50 text-pink-600"
												: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
										}`}
										aria-label="Menu"
										aria-expanded={isMenuOpen}
									>
										{isMenuOpen ? (
											<XMarkIcon className="h-5 w-5 md:h-6 md:w-6" />
										) : (
											<Bars3Icon className="h-5 w-5 md:h-6 md:w-6" />
										)}
									</button>

									{/* Dropdown menu */}
									{isMenuOpen && (
										<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 overflow-hidden">
											<MenuNavLink
												to="/animals"
												onClick={handleMenuLinkClick}
											>
												Animals
											</MenuNavLink>
											<MenuNavLink
												to="/groups"
												onClick={handleMenuLinkClick}
											>
												Groups
											</MenuNavLink>
											<MenuNavLink
												to="/fosters-needed"
												onClick={handleMenuLinkClick}
											>
												Fosters Needed
											</MenuNavLink>
											<MenuNavLink
												to="/fosters"
												onClick={handleMenuLinkClick}
											>
												Fosters
											</MenuNavLink>
											<MenuNavLink
												to="/foster-requests"
												onClick={handleMenuLinkClick}
											>
												Requests
											</MenuNavLink>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}
