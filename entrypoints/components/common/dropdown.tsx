import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import React, {
  Children,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useState,
} from "react";
import { cn } from "~/lib/utils";
import Container from "./container";
import { HStack, VStack } from "./helperdivs";

// Context to share dropdown state with sub-components
type DropdownContextType = {
  isOpen: boolean;
  toggleDropdown: () => void;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

// Dropdown Header Component
export const DropdownHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { children, className, ...rest } = props;
  const context = useContext(DropdownContext);

  if (!context) {
    throw new Error("DropdownHeader must be used within a Dropdown component");
  }

  const { isOpen, toggleDropdown } = context;

	return (
		<HStack
			ref={ref}
			fill
			x="between"
			y="middle"
			className={cn("cursor-pointer", className)}
			onClick={toggleDropdown}
			{...rest}
		>
			{children}
			<span
				className={cn(
					"transition-transform duration-200 w-[20px] px-2 display-flex items-center justify-center"
				)}
			>
				{isOpen ? (
					<CaretUpIcon className="w-4 h-4" />
				) : (
					<CaretDownIcon className="w-4 h-4" />
				)}
			</span>
		</HStack>
	);
});

DropdownHeader.displayName = "DropdownHeader";

// Dropdown Content Component
export const DropdownContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  const { children, className, ...rest } = props;
  const context = useContext(DropdownContext);

  if (!context) {
    throw new Error("DropdownContent must be used within a Dropdown component");
  }

  const { isOpen } = context;

  if (!isOpen) {
    return null;
  }

	return (
		<div ref={ref} className={className} {...rest}>
			{children}
		</div>
	);
});

DropdownContent.displayName = "DropdownContent";

// Main Dropdown Component
const Dropdown = forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		gap?: number;
	}
>((props, ref) => {
	const { children, gap, ...rest } = props;
	const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Separate children into header and content
  let headerChild: React.ReactNode = null;
  let contentChild: React.ReactNode = null;

  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      if (child.type === DropdownHeader) {
        headerChild = child;
      } else if (child.type === DropdownContent) {
        contentChild = child;
      }
    }
  });

	return (
		<DropdownContext.Provider value={{ isOpen, toggleDropdown }}>
			<Container ref={ref} {...rest}>
				<VStack fill gap={gap}>
					{headerChild}
					{contentChild}
				</VStack>
			</Container>
		</DropdownContext.Provider>
	);
});

Dropdown.displayName = "Dropdown";

// Attach sub-components to main component
(Dropdown as any).Header = DropdownHeader;
(Dropdown as any).Content = DropdownContent;

export default Dropdown;
