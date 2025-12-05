import { useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
	const queryClient = useQueryClient();
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

	// Set up Supabase Realtime subscription for new messages
	useEffect(() => {
		if (!conversationId) return;

		// Create a channel for this conversation
		const channel = supabase
			.channel(`messages:${conversationId}`)
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "messages",
					filter: `conversation_id=eq.${conversationId}`,
				},
				async (payload) => {
					// When a new message is inserted, fetch the full message with profile data
					const newMessage = payload.new as {
						id: string;
						conversation_id: string;
						sender_id: string;
						content: string;
						created_at: string;
						edited_at: string | null;
					};

					// Fetch the sender's profile to get the name
					const { data: profileData } = await supabase
						.from("profiles")
						.select("full_name")
						.eq("id", newMessage.sender_id)
						.single();

					const senderName = extractFullName(profileData) ?? "";

					// Create the message object with sender name
					const messageWithSender: Message & { sender_name: string } =
						{
							id: newMessage.id,
							conversation_id: newMessage.conversation_id,
							sender_id: newMessage.sender_id,
							content: newMessage.content,
							created_at: newMessage.created_at,
							edited_at: newMessage.edited_at ?? undefined,
							sender_name: senderName,
						};

					// Update React Query cache by appending the new message
					queryClient.setQueryData<
						(Message & { sender_name: string })[]
					>(["messages", conversationId], (oldMessages) => {
						// Check if message already exists (prevent duplicates)
						if (
							oldMessages?.some(
								(msg) => msg.id === messageWithSender.id
							)
						) {
							return oldMessages;
						}

						// Append new message and sort by created_at to maintain order
						const updated = [
							...(oldMessages || []),
							messageWithSender,
						].sort(
							(a, b) =>
								new Date(a.created_at).getTime() -
								new Date(b.created_at).getTime()
						);

						return updated;
					});

					// Mark that this is not the first load, so we use smooth scroll
					isFirstLoadRef.current = false;
				}
			)
			.subscribe((status) => {
				// Handle connection status changes
				if (status === "SUBSCRIBED") {
					console.log("Subscribed to real-time messages");
				} else if (status === "CHANNEL_ERROR") {
					console.error("Error subscribing to real-time messages");
				} else if (status === "TIMED_OUT") {
					console.warn("Real-time subscription timed out");
				}
			});

		// Cleanup: unsubscribe when component unmounts or conversation changes
		return () => {
			supabase.removeChannel(channel);
		};
	}, [conversationId, queryClient]);

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
