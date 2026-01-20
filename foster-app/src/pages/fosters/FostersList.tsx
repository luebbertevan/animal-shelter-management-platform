import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChatBubbleLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Pagination from "../../components/shared/Pagination";
import { fetchFosters, fetchFostersCount } from "../../lib/fosterQueries";
import { isOffline, getErrorMessage } from "../../lib/errorUtils";
import { DEFAULT_PAGE_SIZE } from "../../lib/filterUtils";
import type { User, Foster } from "../../types";

async function fetchFosterConversation(userId: string, organizationId: string) {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "foster_chat")
		.eq("foster_profile_id", userId)
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null;
		}
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	return data?.id || null;
}

async function fetchCoordinatorGroupChat(organizationId: string) {
	const { data, error } = await supabase
		.from("conversations")
		.select("id")
		.eq("type", "coordinator_group")
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			return null;
		}
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	return data?.id || null;
}

function FosterCard({
	foster,
	currentUserId,
	organizationId,
}: {
	foster: User;
	currentUserId: string;
	organizationId: string;
}) {
	// Fetch conversation ID for this foster
	const { data: conversationId } = useQuery<string | null>({
		queryKey: [
			foster.role === "coordinator"
				? "coordinatorGroupChat"
				: "fosterConversation",
			foster.id,
			organizationId,
		],
		queryFn: async () => {
			if (foster.role === "coordinator") {
				return fetchCoordinatorGroupChat(organizationId);
			}
			return fetchFosterConversation(foster.id, organizationId);
		},
		enabled: foster.id !== currentUserId,
	});

	// Don't show chat icon for current user
	const showChatIcon = foster.id !== currentUserId && conversationId;

	return (
		<div className="bg-white rounded-lg shadow-sm p-5 border border-pink-100 hover:shadow-md transition-shadow relative">
			<div className="flex items-start justify-between mb-3">
				<Link to={`/fosters/${foster.id}`} className="flex-1">
					<h2 className="text-lg font-semibold text-gray-900">
						{foster.full_name?.trim() || "Unnamed Foster"}
					</h2>
				</Link>
				<div className="flex items-center gap-2 ml-2">
					{foster.role === "coordinator" && (
						<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
							Coordinator
						</span>
					)}
					{showChatIcon && (
						<Link
							to={`/chat/${conversationId}`}
							onClick={(e) => e.stopPropagation()}
							className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
							aria-label="Chat"
						>
							<ChatBubbleLeftIcon className="h-5 w-5 text-gray-700" />
						</Link>
					)}
				</div>
			</div>

			<Link to={`/fosters/${foster.id}`} className="block">
				<div className="space-y-2 text-sm">
					{foster.email && (
						<p>
							<span className="text-gray-500">Email:</span>{" "}
							<span className="font-medium">{foster.email}</span>
						</p>
					)}
					{foster.role === "foster" &&
						(foster as Foster).phone_number && (
							<p>
								<span className="text-gray-500">Phone:</span>{" "}
								<span className="font-medium">
									{(foster as Foster).phone_number}
								</span>
							</p>
						)}
					{foster.role === "foster" &&
						(foster as Foster).availability != null && (
							<p>
								<span
									className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
										(foster as Foster).availability
											? "bg-green-100 text-green-800"
											: "bg-gray-100 text-gray-800"
									}`}
								>
									{(foster as Foster).availability
										? "Available"
										: "Not Available"}
								</span>
							</p>
						)}
				</div>
			</Link>
		</div>
	);
}

export default function FostersList() {
	const { user, profile, isCoordinator } = useProtectedAuth();
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	// Get pagination from URL
	const page = parseInt(searchParams.get("page") || "1", 10);
	const pageSize = parseInt(
		searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE),
		10
	);
	const offset = (page - 1) * pageSize;

	const {
		data: fosters = [],
		isLoading,
		isError,
		error,
		refetch,
		isRefetching,
	} = useQuery({
		queryKey: ["fosters", user.id, profile.organization_id, page, pageSize],
		queryFn: () => {
			return fetchFosters(profile.organization_id, {
				fields: [
					"id",
					"email",
					"full_name",
					"phone_number",
					"availability",
					"role",
				],
				orderBy: "full_name",
				orderDirection: "asc",
				checkOffline: true,
				includeCoordinators: true,
				limit: pageSize,
				offset,
			});
		},
		enabled: isCoordinator,
	});

	// Fetch total count for pagination
	const { data: totalCount = 0 } = useQuery({
		queryKey: ["fosters-count", profile.organization_id],
		queryFn: () => fetchFostersCount(profile.organization_id, true),
		enabled: isCoordinator,
	});

	const totalPages = Math.ceil(totalCount / pageSize);

	// Handle page change
	const handlePageChange = (newPage: number) => {
		const params = new URLSearchParams(searchParams);
		if (newPage === 1) {
			params.delete("page");
		} else {
			params.set("page", String(newPage));
		}
		navigate(`/fosters?${params.toString()}`, { replace: true });
	};

	// Redirect non-coordinators (handled by route protection, but double-check)
	if (!isCoordinator) {
		return null;
	}

	return (
		<div className="min-h-screen p-4 bg-gray-50">
			<div className="max-w-5xl mx-auto">
				<div className="mb-6">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Fosters
							</h1>
							<p className="text-gray-600">
								Browse all fosters in your organization.
							</p>
						</div>
						<button
							type="button"
							onClick={() => refetch()}
							disabled={isLoading || isRefetching}
							className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-pink-600 bg-pink-50 border border-pink-200 rounded-md hover:bg-pink-100 hover:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
							aria-label="Refresh fosters"
						>
							<ArrowPathIcon
								className={`h-4 w-4 sm:h-5 sm:w-5 ${
									isRefetching ? "animate-spin" : ""
								}`}
							/>
							<span className="hidden sm:inline">Refresh</span>
						</button>
					</div>
				</div>

				{isLoading && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						<LoadingSpinner message="Loading fosters..." />
					</div>
				)}

				{isError && (
					<div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
						<div className="text-red-700">
							<p className="font-medium mb-2">
								Unable to load fosters right now.
							</p>
							<p className="text-sm mb-4">
								{error instanceof Error
									? error.message
									: "Unknown error"}
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								disabled={isLoading || isRefetching}
								className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Try Again
							</button>
						</div>
					</div>
				)}

				{!isLoading && !isError && fosters.length === 0 && (
					<div className="bg-white rounded-lg shadow-sm p-6">
						{isOffline() ? (
							<div className="text-red-700">
								<p className="font-medium mb-2">
									Unable to load fosters right now.
								</p>
								<p className="text-sm mb-4">
									Unable to connect to the server. Please
									check your internet connection and try
									again.
								</p>
								<button
									type="button"
									onClick={() => refetch()}
									className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 text-sm font-medium transition-colors"
								>
									Try Again
								</button>
							</div>
						) : (
							<div className="text-gray-600">
								No fosters found yet. Once fosters sign up, they
								will appear here.
							</div>
						)}
					</div>
				)}

				{fosters.length > 0 && (
					<>
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{fosters.map((foster) => (
								<FosterCard
									key={foster.id}
									foster={foster}
									currentUserId={user.id}
									organizationId={profile.organization_id}
								/>
							))}
						</div>
						{totalPages > 1 && (
							<Pagination
								currentPage={page}
								totalPages={totalPages}
								onPageChange={handlePageChange}
								totalItems={totalCount}
								itemsPerPage={pageSize}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}
