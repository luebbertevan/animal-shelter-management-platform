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

// Helper component for navigation links
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
	const location = useLocation();
	const isActive = location.pathname.startsWith(to);

	return (
		<Link
			to={to}
			className={`text-sm sm:text-base md:text-lg lg:text-xl font-medium transition-colors ${
				isActive ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
			}`}
		>
			{children}
		</Link>
	);
}

export default function NavigationBar() {
	const navigate = useNavigate();
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
			<div className="max-w-7xl mx-auto px-4">
				<div className="flex items-center justify-between h-20">
					<div className="flex items-center h-full py-0.5 gap-3 sm:gap-4">
						<img
							src="/co_kitty_coalition_logo.avif"
							alt="Co Kitty Coalition"
							className="h-full max-h-full w-auto object-contain"
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
							<div className="hidden md:flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
								<NavLink to="/animals">Animals</NavLink>
								<NavLink to="/groups">Groups</NavLink>
								<NavLink to="/fosters-needed">
									Fosters Needed
								</NavLink>
							</div>
						)}
						{isCoordinator && (
							<div className="hidden md:flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
								<NavLink to="/fosters">Fosters</NavLink>
								<NavLink to="/foster-requests">Requests</NavLink>
							</div>
						)}

						<div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2 md:ml-4">
							<button
								onClick={() => navigate("/dashboard")}
								className="flex items-center justify-center p-2 md:p-3 rounded-lg hover:bg-gray-100 transition-colors"
								aria-label="Home"
							>
								<HomeIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
							</button>

							<button
								onClick={handleChatClick}
								className="flex items-center justify-center p-2 md:p-3 rounded-lg hover:bg-gray-100 transition-colors"
								aria-label="Chat"
							>
								<ChatBubbleLeftIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
							</button>

							{/* Hamburger menu button - only for coordinators on mobile */}
							{isCoordinator && (
								<div className="md:hidden relative" ref={menuRef}>
									<button
										onClick={() => setIsMenuOpen(!isMenuOpen)}
										className="flex items-center justify-center p-2 md:p-3 rounded-lg hover:bg-gray-100 transition-colors"
										aria-label="Menu"
										aria-expanded={isMenuOpen}
									>
										{isMenuOpen ? (
											<XMarkIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
										) : (
											<Bars3Icon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
										)}
									</button>

									{/* Dropdown menu */}
									{isMenuOpen && (
										<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
											<div onClick={handleMenuLinkClick}>
												<NavLink to="/animals">
													<div className="px-4 py-2 hover:bg-gray-50">
														Animals
													</div>
												</NavLink>
											</div>
											<div onClick={handleMenuLinkClick}>
												<NavLink to="/groups">
													<div className="px-4 py-2 hover:bg-gray-50">
														Groups
													</div>
												</NavLink>
											</div>
											<div onClick={handleMenuLinkClick}>
												<NavLink to="/fosters-needed">
													<div className="px-4 py-2 hover:bg-gray-50">
														Fosters Needed
													</div>
												</NavLink>
											</div>
											<div onClick={handleMenuLinkClick}>
												<NavLink to="/fosters">
													<div className="px-4 py-2 hover:bg-gray-50">
														Fosters
													</div>
												</NavLink>
											</div>
											<div onClick={handleMenuLinkClick}>
												<NavLink to="/foster-requests">
													<div className="px-4 py-2 hover:bg-gray-50">
														Requests
													</div>
												</NavLink>
											</div>
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
