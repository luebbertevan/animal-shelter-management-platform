import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "outline" | "danger";
	fullWidth?: boolean;
}

export default function Button({
	children,
	variant = "primary",
	fullWidth = true,
	className = "",
	...props
}: ButtonProps) {
	const baseClasses =
		"relative flex items-center justify-center overflow-hidden py-2 px-4 rounded-[36px] font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors";
	const widthClass = fullWidth ? "w-full" : "w-auto";

	const variantClasses = {
		primary:
			"bg-pink-500 text-white hover:bg-pink-600 focus:ring-pink-500 disabled:bg-pink-300",
		secondary:
			"bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 disabled:bg-gray-100",
		outline:
			"border-2 border-pink-500 text-pink-600 hover:bg-pink-50 focus:ring-pink-500 disabled:border-pink-300 disabled:text-pink-300",
		danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 disabled:bg-red-300",
	};

	return (
		<button
			className={`${baseClasses} ${widthClass} ${variantClasses[variant]} ${className}`}
			{...props}
		>
			<span className="inline-flex flex-nowrap items-center gap-2">
				{children}
			</span>
		</button>
	);
}
