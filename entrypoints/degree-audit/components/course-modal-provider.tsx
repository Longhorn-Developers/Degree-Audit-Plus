import CourseAddModal from "@/entrypoints/components/course-add-modal";
import { createContext, useContext, useState } from "react";

// Context for sharing audit data betw sidebar and main
interface CourseModalContextType {
	isOpen: boolean;
	toggleModal: () => void;
	openModal: () => void;
	closeModal: () => void;
}

const CourseModalContext = createContext<CourseModalContextType | null>(null);

export const CourseModalContextProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const toggleModal = () => {
		setIsOpen(!isOpen);
	};

	const openModal = () => {
		setIsOpen(true);
	};

	const closeModal = () => {
		setIsOpen(false);
	};

	return (
		<CourseModalContext.Provider
			value={{
				isOpen,
				toggleModal,
				openModal,
				closeModal,
			}}
		>
			{children}

			<CourseAddModal
				isOpen={isOpen}
				onClose={closeModal}
				onSearch={(searchData) => {
					console.log("Search data:", searchData);
					// TODO: Implement course search functionality
					closeModal();
				}}
			/>
		</CourseModalContext.Provider>
	);
};

export function useCourseModalContext(): CourseModalContextType {
	const context = useContext(CourseModalContext);
	if (!context) {
		throw new Error(
			"useCourseModalContext must be used within a CourseModalProvider"
		);
	}
	return context;
}

export default CourseModalContextProvider;
