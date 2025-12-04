import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import type { Message } from "../../types";
import { getErrorMessage } from "../../lib/errorUtils";
import { extractFullName } from "../../lib/supabaseUtils";
import MessageBubble from "./MessageBubble";
import LoadingSpinner from "../ui/LoadingSpinner";
import Button from "../ui/Button";

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

	return messagesWithProfile.map((msg) => ({
		id: msg.id,
		conversation_id: msg.conversation_id,
		sender_id: msg.sender_id,
		content: msg.content,
		created_at: msg.created_at,
		edited_at: msg.edited_at,
		sender_name: extractFullName(msg.profiles) ?? "",
	})) as (Message & { sender_name: string })[];
}

export default function MessageList({ conversationId }: MessageListProps) {
	const { user } = useAuth();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const isFirstLoadRef = useRef<boolean>(true);

	const {
		data: messages,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery<(Message & { sender_name: string })[]>({
		queryKey: ["messages", conversationId],
		queryFn: () => fetchMessages(conversationId),
		enabled: !!conversationId,
	});

	// Reset first load flag when conversation changes
	useEffect(() => {
		isFirstLoadRef.current = true;
	}, [conversationId]);

	// Scroll to bottom when messages load or update
	useEffect(() => {
		if (messages && messages.length > 0) {
			// Use requestAnimationFrame to wait for browser's next paint cycle
			// Double RAF ensures layout calculations are complete
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (messagesEndRef.current) {
						// Instant scroll on first load, smooth scroll for updates
						const scrollBehavior = isFirstLoadRef.current
							? "auto"
							: "smooth";
						messagesEndRef.current.scrollIntoView({
							behavior: scrollBehavior,
							block: "end",
						});
						// Mark that first load is complete
						isFirstLoadRef.current = false;
					}
				});
			});
		}
	}, [messages]);

	if (isLoading) {
		return (
			<div className="p-4 flex items-center justify-center min-h-[200px]">
				<LoadingSpinner message="Loading messages..." />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-4 flex flex-col items-center justify-center min-h-[200px] space-y-4">
				<p className="text-red-500 text-center">
					{error instanceof Error
						? error.message
						: "Failed to load messages"}
				</p>
				<Button
					onClick={() => refetch()}
					variant="outline"
					className="w-auto"
				>
					Try Again
				</Button>
			</div>
		);
	}

	if (!messages || messages.length === 0) {
		return (
			<div className="p-4 flex items-center justify-center min-h-[200px]">
				<div className="text-center text-gray-500">
					<p className="text-lg mb-2">No messages yet</p>
					<p className="text-sm">Start the conversation!</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-2 p-4 pb-6">
			{messages.map((message) => {
				const isOwnMessage = message.sender_id === user?.id;

				return (
					<MessageBubble
						key={message.id}
						message={{
							id: message.id,
							content: message.content,
							created_at: message.created_at,
							sender_name: message.sender_name,
						}}
						isOwnMessage={isOwnMessage}
					/>
				);
			})}
			<div ref={messagesEndRef} />
		</div>
	);
}
