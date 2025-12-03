import { useState, useRef, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errorUtils";
import Button from "../ui/Button";

interface MessageInputProps {
	conversationId: string;
	onMessageSent: () => void;
}

async function sendMessage(
	conversationId: string,
	senderId: string,
	content: string
): Promise<void> {
	const { error } = await supabase.from("messages").insert({
		conversation_id: conversationId,
		sender_id: senderId,
		content: content.trim(),
	});

	if (error) {
		throw new Error(
			getErrorMessage(error, "Failed to send message. Please try again.")
		);
	}
}

export default function MessageInput({
	conversationId,
	onMessageSent,
}: MessageInputProps) {
	const { user } = useAuth();
	const [message, setMessage] = useState("");
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-resize textarea based on content
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [message]);

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();

		// Validation: message must not be empty
		const trimmedMessage = message.trim();
		if (!trimmedMessage) {
			return;
		}

		// Validation: user must be authenticated
		if (!user?.id) {
			setError("You must be signed in to send messages.");
			return;
		}

		setSending(true);
		setError(null);

		try {
			await sendMessage(conversationId, user.id, trimmedMessage);
			// Clear input on success
			setMessage("");
			// Notify parent to refetch messages
			onMessageSent();
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to send message. Please try again."
			);
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Send on Enter (but allow Shift+Enter for new line)
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const isDisabled = sending || !message.trim() || !user?.id;

	return (
		<div className="bg-white border-t border-gray-200 p-4">
			{error && (
				<div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
					{error}
				</div>
			)}
			<form onSubmit={handleSubmit} className="flex gap-2">
				<textarea
					ref={textareaRef}
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={sending}
					rows={1}
					className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-y-auto"
					style={{
						minHeight: "40px",
						maxHeight: "120px",
					}}
				/>
				<Button
					type="submit"
					disabled={isDisabled}
					className="w-auto px-6"
				>
					{sending ? "Sending..." : "Send"}
				</Button>
			</form>
		</div>
	);
}
