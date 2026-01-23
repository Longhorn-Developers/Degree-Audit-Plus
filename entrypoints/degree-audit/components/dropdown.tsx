import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

type Props = {
	button: React.ReactNode;
	content: React.ReactNode;
	defaultOpen: boolean;
};

const Dropdown = (props: Props) => {
	const { button, content, defaultOpen } = props;
	const [isExpanded, setIsExpanded] = useState(defaultOpen);

	return (
		<div className="border-b border-gray-100 last:border-b-0">
			{/* Requirement header */}
			<button
				className="w-full py-3 px-2 flex items-start gap-3 hover:bg-gray-50 transition-colors"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				{button}
			</button>

			{/* Expanded courses */}
			<AnimatePresence>
				{isExpanded && content && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2 }}
					>
						{content}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default Dropdown;
