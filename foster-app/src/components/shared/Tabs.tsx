interface TabsProps {
	tabs: Array<{ id: string; label: string }>;
	activeTab: string;
	onTabChange: (tabId: string) => void;
}

/**
 * Simple reusable Tabs component
 * Button-based tabs with active state styling
 */
export default function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
	return (
		<div className="flex border-b border-gray-200">
			{tabs.map((tab) => {
				const isActive = tab.id === activeTab;
				return (
					<button
						key={tab.id}
						type="button"
						onClick={() => onTabChange(tab.id)}
						className={`px-4 py-2 text-sm font-medium transition-colors ${
							isActive
								? "text-pink-600 border-b-2 border-pink-600"
								: "text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
						}`}
						aria-selected={isActive}
						role="tab"
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}

