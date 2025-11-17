interface FormContainerProps {
	title: string;
	subtitle?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

export default function FormContainer({
	title,
	subtitle,
	children,
	footer,
}: FormContainerProps) {
	return (
		<div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
			<div className="w-full max-w-sm">
				<div className="bg-white rounded-lg shadow-md p-6">
					<h1 className="text-2xl font-bold mb-2 text-gray-900">
						{title}
					</h1>
					{subtitle && (
						<p className="text-gray-600 text-sm mb-6">{subtitle}</p>
					)}
					{children}
					{footer && <div className="mt-6">{footer}</div>}
				</div>
			</div>
		</div>
	);
}
