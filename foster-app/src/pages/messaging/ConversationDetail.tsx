import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useUserProfile } from "../../hooks/useUserProfile";
import type { Conversation } from "../../types";
import MessageList from "../../components/messaging/MessageList";
import MessageInput from "../../components/messaging/MessageInput";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import Button from "../../components/ui/Button";
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
	const navigate = useNavigate();
	const { profile } = useUserProfile();
	const queryClient = useQueryClient();

	const {
		data: conversation,
		isLoading,
		isError,
		error,
	} = useQuery<Conversation & { foster_name?: string }, Error>({
		queryKey: ["conversation", conversationId, profile?.organization_id],
		queryFn: async () => {
			if (!conversationId) {
				throw new Error("Conversation ID is required");
			}
			if (!profile?.organization_id) {
				throw new Error("Organization ID not available");
			}
			return fetchConversation(conversationId, profile.organization_id);
		},
		enabled: !!conversationId && !!profile?.organization_id,
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
					<Button onClick={() => navigate(-1)}>Go Back</Button>
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
		if (profile?.role === "foster") {
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

	// Determine back button navigation based on user role
	const handleBack = () => {
		if (profile?.role === "foster") {
			navigate("/dashboard");
		} else {
			// Coordinators navigate to conversation list
			navigate("/chats");
		}
	};

	return (
		<div className="h-screen flex flex-col bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 shadow-sm flex-shrink-0">
				<Button
					onClick={handleBack}
					variant="outline"
					className="w-auto"
				>
					← Back
				</Button>
				{headerText && (
					<h1 className="text-xl font-semibold text-gray-800">
						{headerText}
					</h1>
				)}
			</div>

			{/* Message List */}
			<div className="flex-1 overflow-y-auto">
				<MessageList conversationId={conversation.id} />
			</div>

			{/* Message Input */}
			{conversationId && (
				<MessageInput
					conversationId={conversationId}
					onMessageSent={handleMessageSent}
				/>
			)}
		</div>
	);
}
