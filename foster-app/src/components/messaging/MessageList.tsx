import { useRef, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useProtectedAuth } from "../../hooks/useProtectedAuth";
import type {
	LifeStage,
	MessageWithLinks,
	MessageWithMetadata,
	PhotoMetadata,
} from "../../types";
import { getErrorMessage } from "../../lib/errorUtils";
import { transformMessageWithLinks } from "../../lib/messageLinkUtils";
import MessageBubble from "./MessageBubble";
import LoadingSpinner from "../ui/LoadingSpinner";
import Button from "../ui/Button";
import { fetchAnimalsByIds } from "../../lib/animalQueries";
import { TAG_TYPES } from "../../types";

interface MessageListProps {
	conversationId: string;
	scrollableContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// Message pagination limit - set to 5 for testing, 100 for production
const MESSAGE_LIMIT = 100;

async function fetchMessages(
	conversationId: string,
	beforeDate?: string,
	limit: number = MESSAGE_LIMIT
) {
	let query = supabase
		.from("messages")
		.select(
			`
			id,
			conversation_id,
			sender_id,
			content,
			created_at,
			edited_at,
			photo_urls,
			profiles!messages_sender_id_fkey(full_name),
			message_links(
				id,
				animal_id,
				group_id,
				foster_profile_id,
				animals(
					id,
					name,
					status,
					sex_spay_neuter_status,
					priority,
					photos,
					date_of_birth,
					group_id
				),
				animal_groups(
					id,
					name,
					description,
					animal_ids,
					priority,
					group_photos
				),
				profiles(full_name)
			)
		`
		)
		.eq("conversation_id", conversationId)
		.order("created_at", { ascending: false }) // Newest first for pagination
		.limit(limit);

	// If beforeDate is provided, fetch messages older than that date
	if (beforeDate) {
		query = query.lt("created_at", beforeDate);
	}

	const { data, error } = await query;

	if (error) {
		throw new Error(
			getErrorMessage(
				error,
				"Failed to fetch messages. Please try again."
			)
		);
	}

	// Transform data to include sender name and tags
	// The JOIN returns profiles as a nested object: { profiles: { full_name: "..." } }
	// message_links includes joined data from animals, animal_groups, and profiles
	// Cast the data to our known type since Supabase doesn't infer JOIN types
	const messagesWithProfile = (data || []) as unknown as MessageWithLinks[];

	// Reverse to get oldest first for display (since we fetched newest first)
	// Use shared transformation function
	const transformed = messagesWithProfile
		.map(transformMessageWithLinks)
		.reverse(); // Reverse to display oldest first

	return transformed;
}

export default function MessageList({
	conversationId,
	scrollableContainerRef: parentScrollableContainerRef,
}: MessageListProps) {
	const { user, profile } = useProtectedAuth();
	const queryClient = useQueryClient();
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const isFirstLoadRef = useRef<boolean>(true);
	const isLoadingOlderRef = useRef<boolean>(false);
	const [oldestMessageDate, setOldestMessageDate] = useState<string | null>(
		null
	);
	const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
	const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
	const [isAtTop, setIsAtTop] = useState<boolean>(false);
	const [hasScrolledToBottom, setHasScrolledToBottom] =
		useState<boolean>(false);

	const {
		data: messages,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery<MessageWithMetadata[]>({
		queryKey: ["messages", conversationId],
		queryFn: () => fetchMessages(conversationId),
		enabled: !!conversationId,
	});

	// Collect unique animal IDs for any GROUP tags currently in the message list.
	// This lets GroupCard fall back to individual animal photos when a group has no group photos.
	const groupTaggedAnimalIds = useMemo(() => {
		const idSet = new Set<string>();
		(messages || []).forEach((msg) => {
			(msg.tags || []).forEach((tag) => {
				if (
					tag.type === TAG_TYPES.GROUP &&
					tag.group &&
					Array.isArray(tag.group.animal_ids)
				) {
					tag.group.animal_ids.forEach((animalId) => {
						if (animalId) idSet.add(animalId);
					});
				}
			});
		});
		return Array.from(idSet).sort();
	}, [messages]);

	// Fetch only the animals referenced by those group tags (minimal fields for the card UI).
	const { data: animalsForTaggedGroups = [] } = useQuery({
		queryKey: [
			"messages-tagged-group-animals",
			profile.organization_id,
			groupTaggedAnimalIds,
		],
		queryFn: async () => {
			return fetchAnimalsByIds(groupTaggedAnimalIds, profile.organization_id, {
				fields: ["id", "photos", "life_stage"],
			});
		},
		enabled: groupTaggedAnimalIds.length > 0,
	});

	// Map for GroupCard: Key = animal ID, Value = { photos, life_stage }
	const animalDataMap = useMemo(() => {
		const map = new Map<
			string,
			{ photos?: PhotoMetadata[]; life_stage?: LifeStage }
		>();
		animalsForTaggedGroups.forEach((animal) => {
			if (animal.id) {
				map.set(animal.id, {
					photos: animal.photos,
					life_stage: animal.life_stage,
				});
			}
		});
		return map;
	}, [animalsForTaggedGroups]);

	// Track oldest message date and whether there are more messages when data loads
	// Only update on initial load, not when messages change due to pagination
	useEffect(() => {
		if (messages && messages.length > 0) {
			// Only update on initial load (when oldestMessageDate is not set)
			// This prevents resetting hasMoreMessages when loading older messages
			if (!oldestMessageDate) {
				setOldestMessageDate(messages[0].created_at);
				// If we got the full limit, there might be more messages
				setHasMoreMessages(messages.length === MESSAGE_LIMIT);
			}
		} else {
			setOldestMessageDate(null);
			setHasMoreMessages(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages]); // Only run when messages change, not when oldestMessageDate changes

	// Reset first load flag and pagination state when conversation changes
	useEffect(() => {
		isFirstLoadRef.current = true;
		isLoadingOlderRef.current = false;
		setOldestMessageDate(null);
		setHasMoreMessages(false);
		setIsAtTop(false);
		setHasScrolledToBottom(false);
	}, [conversationId]);

	// Track scroll position to show "Load Older Messages" button only when at top
	useEffect(() => {
		const scrollableContainer = parentScrollableContainerRef?.current;
		if (!scrollableContainer) return;

		const handleScroll = () => {
			// Check if scrolled to top (within 10px threshold for better UX)
			const isScrolledToTop = scrollableContainer.scrollTop <= 10;
			setIsAtTop(isScrolledToTop);
		};

		scrollableContainer.addEventListener("scroll", handleScroll);
		// Check initial scroll position after layout is complete
		// Use requestAnimationFrame to wait for browser's next paint cycle
		// Double RAF ensures layout calculations are complete
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				handleScroll();
			});
		});

		return () => {
			scrollableContainer.removeEventListener("scroll", handleScroll);
		};
	}, [messages, parentScrollableContainerRef]);

	// Load older messages function
	const loadOlderMessages = async () => {
		// Validate required data
		if (!conversationId || !oldestMessageDate || isLoadingMore) {
			if (!conversationId) {
				console.error("loadOlderMessages: conversationId is required");
			}
			if (!oldestMessageDate) {
				console.error(
					"loadOlderMessages: oldestMessageDate is required"
				);
			}
			return;
		}

		// Validate DOM refs - these should exist when user clicks the button
		const scrollableContainer = parentScrollableContainerRef?.current;
		if (!scrollableContainer || !messagesContainerRef.current) {
			console.error(
				"loadOlderMessages: Required DOM refs not available",
				{
					scrollableContainer: !!scrollableContainer,
					messagesContainer: !!messagesContainerRef.current,
				}
			);
			return;
		}

		// Save scroll position and container height before loading
		const scrollTopBefore = scrollableContainer.scrollTop;
		const containerHeightBefore = messagesContainerRef.current.scrollHeight;

		setIsLoadingMore(true);
		isLoadingOlderRef.current = true; // Set flag to prevent scroll-to-bottom effect
		try {
			const olderMessages = await fetchMessages(
				conversationId,
				oldestMessageDate,
				MESSAGE_LIMIT
			);

			if (olderMessages.length > 0) {
				// Prepend older messages to the cached messages
				queryClient.setQueryData<MessageWithMetadata[]>(
					["messages", conversationId],
					(cachedMessages) => {
						if (!cachedMessages) return olderMessages;

						// Combine and sort to maintain chronological order
						const combined = [
							...olderMessages,
							...cachedMessages,
						].sort(
							(a, b) =>
								new Date(a.created_at).getTime() -
								new Date(b.created_at).getTime()
						);

						return combined;
					}
				);

				// Update oldest message date to the oldest message in the newly loaded batch
				setOldestMessageDate(olderMessages[0].created_at);
				// If we got the full limit, there might be more messages
				// Keep hasMoreMessages true if we got a full batch
				setHasMoreMessages(olderMessages.length === MESSAGE_LIMIT);

				// Restore scroll position after DOM updates
				// Use requestAnimationFrame to wait for browser's next paint cycle
				// Double RAF ensures layout calculations are complete
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						if (
							scrollableContainer &&
							messagesContainerRef.current
						) {
							const containerHeightAfter =
								messagesContainerRef.current.scrollHeight;
							const heightDifference =
								containerHeightAfter - containerHeightBefore;

							// Adjust scroll position by the height of newly added messages
							// This keeps the user viewing the same messages they were looking at
							scrollableContainer.scrollTop =
								scrollTopBefore + heightDifference;

							// Clear the flag after scroll restoration is complete
							isLoadingOlderRef.current = false;
						}
					});
				});
			} else {
				// No more messages to load
				setHasMoreMessages(false);
				isLoadingOlderRef.current = false;
			}
		} catch (error) {
			console.error("Failed to load older messages:", error);
			isLoadingOlderRef.current = false;
		} finally {
			setIsLoadingMore(false);
		}
	};

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
					// When a new message is inserted, fetch the full message with profile data and tags
					const newMessage = payload.new as {
						id: string;
						conversation_id: string;
						sender_id: string;
						content: string;
						created_at: string;
						edited_at: string | null;
						photo_urls: string[] | null;
					};

					// Fetch message with profile join and message_links with all entity joins
					const { data: messageData, error: fetchError } =
						await supabase
							.from("messages")
							.select(
								`
							id,
							conversation_id,
							sender_id,
							content,
							created_at,
							edited_at,
							photo_urls,
							profiles!messages_sender_id_fkey(full_name),
							message_links(
								id,
								animal_id,
								group_id,
								foster_profile_id,
								animals(
									id,
									name,
									status,
									sex_spay_neuter_status,
									priority,
									photos,
									date_of_birth,
									group_id
								),
								animal_groups(
									id,
									name,
									description,
									animal_ids,
									priority,
									group_photos
								),
								profiles(full_name)
							)
						`
							)
							.eq("id", newMessage.id)
							.single();

					if (fetchError || !messageData) {
						console.error(
							"Failed to fetch message details:",
							fetchError
						);
						return;
					}

					// Transform using shared function
					// Cast through unknown to handle Supabase's type inference
					const messageWithMetadata = transformMessageWithLinks(
						messageData as unknown as MessageWithLinks
					);

					// Update React Query cache by appending the new message
					queryClient.setQueryData<MessageWithMetadata[]>(
						["messages", conversationId],
						(cachedMessages) => {
							// Check if message already exists (prevent duplicates)
							if (
								cachedMessages?.some(
									(msg) => msg.id === messageWithMetadata.id
								)
							) {
								return cachedMessages;
							}

							// Append new message and sort by created_at to maintain order
							const updated = [
								...(cachedMessages || []),
								messageWithMetadata,
							].sort(
								(a, b) =>
									new Date(a.created_at).getTime() -
									new Date(b.created_at).getTime()
							);

							return updated;
						}
					);

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

	// Scroll to bottom only on initial load (not when loading older messages or real-time updates)
	useEffect(() => {
		// Don't scroll if we're currently loading older messages or just finished loading them
		if (isLoadingMore || isLoadingOlderRef.current) return;

		// Only scroll on first load (when isFirstLoadRef is true)
		// Real-time updates handle their own scrolling in the subscription handler
		if (messages && messages.length > 0 && isFirstLoadRef.current) {
			// Use requestAnimationFrame to wait for browser's next paint cycle
			// Double RAF ensures layout calculations are complete
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (
						messagesEndRef.current &&
						parentScrollableContainerRef?.current
					) {
						// Scroll the container to show the bottom (messages end ref)
						// This ensures messages are visible but doesn't push input out of view
						parentScrollableContainerRef.current.scrollTop =
							parentScrollableContainerRef.current.scrollHeight;
						// Mark that first load is complete and scroll has happened
						isFirstLoadRef.current = false;
						// Set flag to show messages after scroll is complete
						// Use another RAF to ensure scroll has actually happened
						requestAnimationFrame(() => {
							setHasScrolledToBottom(true);
						});
					} else if (messagesEndRef.current) {
						// Fallback if no parent container ref
						messagesEndRef.current.scrollIntoView({
							behavior: "auto",
							block: "end",
						});
						isFirstLoadRef.current = false;
						requestAnimationFrame(() => {
							setHasScrolledToBottom(true);
						});
					}
				});
			});
		} else if (messages && messages.length > 0 && !isFirstLoadRef.current) {
			// If messages exist but it's not first load, we can show them immediately
			setHasScrolledToBottom(true);
		}
	}, [messages, isLoadingMore, parentScrollableContainerRef]);

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
		<div
			ref={messagesContainerRef}
			className="space-y-2 p-4 pb-6"
			style={{
				opacity: hasScrolledToBottom ? 1 : 0,
				transition: hasScrolledToBottom
					? "opacity 0.1s ease-in"
					: "none",
			}}
		>
			{/* Load Older Messages button - only show when at top and there are more messages */}
			{hasMoreMessages && isAtTop && (
				<div className="flex justify-center py-2">
					<Button
						onClick={loadOlderMessages}
						variant="outline"
						disabled={isLoadingMore}
						className="w-auto"
					>
						{isLoadingMore ? "Loading..." : "Load Older Messages"}
					</Button>
				</div>
			)}

			{messages.map((message) => {
				const isOwnMessage = message.sender_id === user.id;

				return (
					<MessageBubble
						key={message.id}
						message={{
							id: message.id,
							content: message.content,
							created_at: message.created_at,
							sender_name: message.sender_name,
							photo_urls: message.photo_urls,
							tags: message.tags,
						}}
						isOwnMessage={isOwnMessage}
						animalDataMap={animalDataMap}
					/>
				);
			})}
			<div ref={messagesEndRef} />
		</div>
	);
}
