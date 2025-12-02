import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import type { Message } from "../../types";
import { getErrorMessage } from "../../lib/errorUtils";

interface MessageListProps {
	conversationId: string;
}

// Type for message with joined profile data from Supabase
type MessageWithProfile = {
	id: string;
	conversation_id: string;
	sender_id: string;
	content: string;
	created_at: string;
	edited_at: string | null;
	profiles: { full_name: string } | null;
};

async function fetchMessages(conversationId: string) {
	const { data, error } = await supabase
		.from("messages")
		.select(
			`
			id,
			conversation_id,
			sender_id,
			content,
			created_at,
			edited_at,
			profiles!messages_sender_id_fkey(full_name)
		`
		)
		.eq("conversation_id", conversationId)
		.order("created_at", { ascending: true }); // Oldest first

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch messages. Please try again."
			)
		);
	}

	// Transform data to include sender name
	// The JOIN returns profiles as a nested object: { profiles: { full_name: "..." } }
	// Cast the data to our known type since Supabase doesn't infer JOIN types
	const messagesWithProfile = (data || []) as unknown as MessageWithProfile[];

	return messagesWithProfile.map((msg) => {
		const senderName = msg.profiles?.full_name ?? "";

		return {
			id: msg.id,
			conversation_id: msg.conversation_id,
			sender_id: msg.sender_id,
			content: msg.content,
			created_at: msg.created_at,
			edited_at: msg.edited_at,
			sender_name: senderName,
		};
	}) as (Message & { sender_name: string })[];
}

export default function MessageList({ conversationId }: MessageListProps) {
	const { user } = useAuth();

	const {
		data: messages,
		isLoading,
		isError,
		error,
	} = useQuery<(Message & { sender_name: string })[]>({
		queryKey: ["messages", conversationId],
		queryFn: () => fetchMessages(conversationId),
		enabled: !!conversationId,
	});

	if (isLoading) {
		return (
			<div className="p-4 text-center text-gray-500">
				Loading messages...
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-4 text-center text-red-500">
				{error instanceof Error
					? error.message
					: "Failed to load messages"}
			</div>
		);
	}

	if (!messages || messages.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">No messages yet</div>
		);
	}

	return (
		<div className="space-y-3 p-4">
			{messages.map((message) => {
				const isOwnMessage = message.sender_id === user?.id;
				const timestamp = new Date(message.created_at).toLocaleString(
					undefined,
					{
						year: "numeric",
						month: "numeric",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					}
				);

				return (
					<div
						key={message.id}
						className={`flex ${
							isOwnMessage ? "justify-end" : "justify-start"
						}`}
					>
						<div
							className={`rounded-lg p-3 max-w-[80%] ${
								isOwnMessage
									? "bg-blue-100 text-right"
									: "bg-gray-100 text-left"
							}`}
						>
							<div className="text-sm text-gray-600 mb-1">
								{isOwnMessage ? "You" : message.sender_name} •{" "}
								{timestamp}
							</div>
							<div className="text-gray-900 break-words">
								{message.content}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
