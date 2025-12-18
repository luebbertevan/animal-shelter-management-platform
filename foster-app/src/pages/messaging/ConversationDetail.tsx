import { useParams} from "react-router-dom";
import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { Conversation } from "../../types";
import MessageList from "../../components/messaging/MessageList";
import MessageInput from "../../components/messaging/MessageInput";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getErrorMessage } from "../../lib/errorUtils";
import { extractFullName } from "../../lib/supabaseUtils";

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

export default function ConversationDetail() {
	const { conversationId } = useParams<{ conversationId: string }>();
	const { profile } = useProtectedAuth();
	const queryClient = useQueryClient();
	const scrollableContainerRef = useRef<HTMLDivElement>(null);

	const {
		data: conversation,
		isLoading,
		isError,
		error,
	} = useQuery<Conversation & { foster_name?: string }, Error>({
		queryKey: ["conversation", conversationId, profile.organization_id],
		queryFn: async () => {
			if (!conversationId) {
				throw new Error("Conversation ID is required");
			}
			return fetchConversation(conversationId, profile.organization_id);
		},
		enabled: !!conversationId,
	});

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<div className="text-center">
					<p className="text-red-500 mb-4">
						{error instanceof Error
							? error.message
							: "Failed to load conversation"}
					</p>
				</div>
			</div>
		);
	}

	if (!conversation) {
		// This should only happen if query is disabled or still initializing
		// Show loading state instead of "not found" to prevent flash
		return (
			<div className="min-h-screen flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	// Determine conversation header text based on user role
	const getHeaderText = () => {
		// For fosters, show nothing
		if (profile.role === "foster") {
			return "";
		}

		// For coordinators
		if (conversation.type === "coordinator_group") {
			return "Coordinator Chat";
		}

		// For coordinators viewing foster chat, show foster's name
		return conversation.foster_name || "Foster Chat";
	};

	const headerText = getHeaderText();

	// Handle message sent - refetch messages to show new message in list
	const handleMessageSent = () => {
		if (conversationId) {
			queryClient.invalidateQueries({
				queryKey: ["messages", conversationId],
			});
		}
	};

	return (
		<div className="mobile-viewport flex flex-col bg-gray-50 overflow-hidden">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 p-4 shadow-sm flex-shrink-0">
				{headerText && (
					<h1 className="text-xl font-semibold text-gray-800">
						{headerText}
					</h1>
				)}
			</div>

			{/* Message List */}
			<div
				ref={scrollableContainerRef}
				className="flex-1 overflow-y-auto min-h-0"
			>
				<MessageList
					conversationId={conversation.id}
					scrollableContainerRef={scrollableContainerRef}
				/>
			</div>

			{/* Message Input */}
			{conversationId && (
				<div className="flex-shrink-0">
					<MessageInput
						conversationId={conversationId}
						onMessageSent={handleMessageSent}
					/>
				</div>
			)}
		</div>
	);
}
