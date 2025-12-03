interface MessageBubbleProps {
	message: {
		id: string;
		content: string;
		created_at: string;
		sender_name: string;
	};
	isOwnMessage: boolean;
}

export default function MessageBubble({
	message,
	isOwnMessage,
}: MessageBubbleProps) {
	const timestamp = new Date(message.created_at).toLocaleString(undefined, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div
			className={`flex ${
				isOwnMessage ? "justify-end" : "justify-start"
			} mb-1`}
		>
			<div
				className={`rounded-lg p-3 max-w-[85%] sm:max-w-[80%] shadow-sm ${
					isOwnMessage
						? "bg-blue-500 text-white text-right"
						: "bg-white border border-gray-200 text-left"
				}`}
			>
				<div
					className={`text-xs sm:text-sm mb-1.5 ${
						isOwnMessage ? "text-blue-100" : "text-gray-500"
					}`}
				>
					{isOwnMessage ? "You" : message.sender_name} • {timestamp}
				</div>
				<div
					className={`break-words leading-relaxed ${
						isOwnMessage ? "text-white" : "text-gray-900"
					}`}
				>
					{message.content}
				</div>
			</div>
		</div>
	);
}
