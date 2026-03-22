import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type { Conversation } from "../../types";
import LoadingSpinner from "../ui/LoadingSpinner";
import { getErrorMessage } from "../../lib/errorUtils";
import { extractFullName } from "../../lib/supabaseUtils";

interface ConversationWithFosterName extends Conversation {
	foster_name?: string;
}

interface ConversationSidebarProps {
	selectedConversationId?: string;
	onSelectConversation: (conversationId: string) => void;
	autoSelectFirst?: boolean;
	className?: string;
}

async function fetchConversations(organizationId: string) {
	// Fetch all conversations for the organization
	const { data: conversations, error: conversationsError } = await supabase
		.from("conversations")
		.select(
			`
			id,
			organization_id,
			type,
			foster_profile_id,
			created_at,
			updated_at,
			profiles!conversations_foster_profile_id_fkey(full_name)
		`
		)
		.eq("organization_id", organizationId)
		.order("updated_at", { ascending: false });

	if (conversationsError) {
		throw new Error(
			getErrorMessage(
				conversationsError,
				"Failed to load conversations. Please try again."
			)
		);
	}

	// Transform conversations to include foster name
	const conversationsWithFosterName: ConversationWithFosterName[] = (
		conversations || []
	).map((conv) => ({
		id: conv.id,
		organization_id: conv.organization_id,
		type: conv.type,
		foster_profile_id: conv.foster_profile_id,
		created_at: conv.created_at,
		updated_at: conv.updated_at,
		foster_name: extractFullName(conv.profiles),
	}));

	// Sort conversations: coordinator_group first, then foster_chats
	const sortedConversations = conversationsWithFosterName.sort((a, b) => {
		if (a.type === "coordinator_group" && b.type !== "coordinator_group") {
			return -1;
		}
		if (a.type !== "coordinator_group" && b.type === "coordinator_group") {
			return 1;
		}
		// If both are same type, maintain the updated_at order
		return 0;
	});

	return sortedConversations;
}

export default function ConversationSidebar({
	selectedConversationId,
	onSelectConversation,
	autoSelectFirst = false,
	className = "",
}: ConversationSidebarProps) {
	const { profile } = useProtectedAuth();

	const {
		data: conversations,
		isLoading,
		isError,
		error,
	} = useQuery<ConversationWithFosterName[]>({
		queryKey: ["conversations", profile.organization_id],
		queryFn: async () => {
			return fetchConversations(profile.organization_id);
		},
	});

	// Auto-select first conversation when loaded (if enabled and none selected)
	useEffect(() => {
		if (
			autoSelectFirst &&
			!selectedConversationId &&
			conversations &&
			conversations.length > 0
		) {
			onSelectConversation(conversations[0].id);
		}
	}, [autoSelectFirst, selectedConversationId, conversations, onSelectConversation]);

	if (isLoading) {
		return (
			<div className={`flex items-center justify-center p-4 ${className}`}>
				<LoadingSpinner />
			</div>
		);
	}

	if (isError) {
		return (
			<div className={`flex flex-col items-center justify-center p-4 ${className}`}>
				<p className="text-red-500 text-center text-sm">
					{error instanceof Error
						? error.message
						: "Failed to load conversations"}
				</p>
			</div>
		);
	}

	if (!conversations || conversations.length === 0) {
		return (
			<div className={`flex flex-col ${className}`}>
				<div className="p-4 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">Chats</h2>
				</div>
				<div className="flex-1 flex items-center justify-center p-4">
					<div className="text-center text-gray-500">
						<p className="text-sm mb-1">No conversations yet</p>
						<p className="text-xs">
							Conversations will appear here when messages are sent.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={`flex flex-col ${className}`}>
			<div className="p-4 border-b border-gray-200 flex-shrink-0">
				<h2 className="text-lg font-semibold text-gray-900">Chats</h2>
			</div>
			<div className="flex-1 overflow-y-auto">
				<ul className="list-none flex flex-col">
					{conversations.map((conversation) => {
						const displayName =
							conversation.type === "coordinator_group"
								? "Coordinator Chat"
								: conversation.foster_name || "Foster Chat";

						const isSelected = conversation.id === selectedConversationId;
						const isCoordinatorChat =
							conversation.type === "coordinator_group";

						return (
							<li
								key={conversation.id}
								className="border-b border-gray-100 last:border-b-0"
							>
								<button
									type="button"
									aria-current={isSelected ? true : undefined}
									onClick={() =>
										onSelectConversation(conversation.id)
									}
									className={`w-full pl-6 pr-4 py-3 text-left text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-500 ${
										isSelected
											? "bg-pink-100 text-gray-900 hover:bg-pink-200"
											: isCoordinatorChat
												? "bg-pink-50 text-pink-900 hover:bg-pink-100"
												: "text-gray-900 hover:bg-gray-50"
									}`}
								>
									<span className="block truncate">
										{displayName}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
