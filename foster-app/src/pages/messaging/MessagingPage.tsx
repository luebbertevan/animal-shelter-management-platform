import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { Conversation } from "../../types";
import ConversationSidebar from "../../components/messaging/ConversationSidebar";
import MessageList from "../../components/messaging/MessageList";
import MessageInput from "../../components/messaging/MessageInput";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getErrorMessage } from "../../lib/errorUtils";
import { extractFullName } from "../../lib/supabaseUtils";
import { Link } from "react-router-dom";

async function fetchConversation(
	conversationId: string,
	organizationId: string
) {
	const { data, error } = await supabase
		.from("conversations")
		.select(
			`
			*,
			profiles!conversations_foster_profile_id_fkey(full_name)
		`
		)
		.eq("id", conversationId)
		.eq("organization_id", organizationId)
		.single();

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to load conversation. Please try again."
			)
		);
	}

	// Extract foster name from joined data
	const fosterName = extractFullName(data.profiles);

	return {
		...data,
		foster_name: fosterName,
	} as Conversation & { foster_name?: string };
}

// Custom hook to detect if we're on mobile
function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkIsMobile = () => {
			setIsMobile(window.innerWidth < 1024); // lg breakpoint
		};

		checkIsMobile();
		window.addEventListener("resize", checkIsMobile);
		return () => window.removeEventListener("resize", checkIsMobile);
	}, []);

	return isMobile;
}

export default function MessagingPage() {
	const { profile } = useProtectedAuth();
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const scrollableContainerRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();

	// Get selected conversation from URL params
	const selectedConversationId = searchParams.get("conversation") || undefined;

	// Fetch selected conversation details
	const {
		data: selectedConversation,
		isLoading: isLoadingConversation,
		isError: isConversationError,
		error: conversationError,
	} = useQuery<Conversation & { foster_name?: string }, Error>({
		queryKey: [
			"conversation",
			selectedConversationId,
			profile.organization_id,
		],
		queryFn: async () => {
			if (!selectedConversationId) {
				throw new Error("Conversation ID is required");
			}
			return fetchConversation(
				selectedConversationId,
				profile.organization_id
			);
		},
		enabled: !!selectedConversationId,
	});

	// Handle conversation selection
	const handleSelectConversation = (conversationId: string) => {
		if (isMobile) {
			// On mobile, navigate to the chat detail page
			navigate(`/chat/${conversationId}`);
		} else {
			// On desktop, update URL params to show conversation in main area
			setSearchParams({ conversation: conversationId });
		}
	};

	// Handle message sent - refetch messages
	const handleMessageSent = () => {
		if (selectedConversationId) {
			queryClient.invalidateQueries({
				queryKey: ["messages", selectedConversationId],
			});
		}
	};

	// Get header text for the conversation
	const getHeaderText = () => {
		if (!selectedConversation) return "";

		if (selectedConversation.type === "coordinator_group") {
			return "Coordinator Chat";
		}

		return selectedConversation.foster_name || "Foster Chat";
	};

	const headerText = getHeaderText();

	// Mobile view: show only the conversation list
	if (isMobile) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ConversationSidebar
					selectedConversationId={selectedConversationId}
					onSelectConversation={handleSelectConversation}
					className="bg-white min-h-screen"
				/>
			</div>
		);
	}

	// Desktop view: sidebar + main chat area
	return (
		<div className="h-[calc(100dvh-3rem)] sm:h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] flex bg-gray-100">
			{/* Sidebar */}
			<aside className="w-80 bg-white border-r border-gray-200 flex-shrink-0 hidden lg:flex lg:flex-col">
				<ConversationSidebar
					selectedConversationId={selectedConversationId}
					onSelectConversation={handleSelectConversation}
					autoSelectFirst
					className="flex-1"
				/>
			</aside>

			{/* Main chat area */}
			<main className="flex-1 flex flex-col overflow-hidden bg-white">
					{!selectedConversationId ? (
						// No conversation selected
						<div className="flex-1 flex items-center justify-center">
							<div className="text-center text-gray-500">
								<p className="text-lg mb-2">Select a conversation</p>
								<p className="text-sm">
									Choose a chat from the sidebar to start messaging.
								</p>
							</div>
						</div>
					) : isLoadingConversation ? (
						// Loading conversation
						<div className="flex-1 flex items-center justify-center">
							<LoadingSpinner />
						</div>
					) : isConversationError ? (
						// Error loading conversation
						<div className="flex-1 flex items-center justify-center p-4">
							<p className="text-red-500 text-center">
								{conversationError instanceof Error
									? conversationError.message
									: "Failed to load conversation"}
							</p>
						</div>
					) : selectedConversation ? (
						// Conversation loaded - show chat
						<>
							{/* Header */}
							<div className="bg-white border-b border-gray-200 p-4 shadow-sm flex-shrink-0">
								{headerText && (
									<h1 className="text-xl font-semibold text-gray-800">
										{selectedConversation.type === "foster_chat" &&
										selectedConversation.foster_profile_id ? (
											<Link
												to={`/fosters/${selectedConversation.foster_profile_id}`}
												className="text-pink-600 hover:text-pink-700 hover:underline"
											>
												{headerText}
											</Link>
										) : (
											headerText
										)}
									</h1>
								)}
							</div>

							{/* Message List */}
							<div
								ref={scrollableContainerRef}
								className="flex-1 overflow-y-auto min-h-0"
							>
								<MessageList
									conversationId={selectedConversation.id}
									scrollableContainerRef={scrollableContainerRef}
								/>
							</div>

							{/* Message Input */}
							<div className="flex-shrink-0">
								<MessageInput
									conversationId={selectedConversationId}
									onMessageSent={handleMessageSent}
								/>
							</div>
						</>
					) : null}
			</main>
		</div>
	);
}
