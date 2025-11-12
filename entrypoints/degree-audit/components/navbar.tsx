import Button, { IconButton } from "@/entrypoints/components/common/button";
import { HStack } from "@/entrypoints/components/common/helperdivs";
import { usePreferences } from "@/entrypoints/providers/main-page";
import {
	ExportIcon,
	GearIcon,
	ListIcon,
	RepeatIcon,
} from "@phosphor-icons/react";

const Logo = ({ size }: { size: number }) => {
	return (
		<div
			className="rounded-lg overflow-hidden shadow-sm shadow-black/20"
			style={{ width: size, height: size }}
		>
			<img
				src="/icon/LHD Logo.png"
				alt="Degree Audit Plus Logo"
				style={{ width: size, height: size }}
			/>
		</div>
	);
};

const Navbar = () => {
	const { toggleSidebar, sidebarIsOpen } = usePreferences();

	return (
		<HStack
			fill
			x="around"
			y="middle"
			className="border-b-4 border-gray-800 px-10 py-2"
		>
			{!sidebarIsOpen && (
				<Button
					className="p-2 rounded-full"
					fill="none"
					onClick={async () => await toggleSidebar()}
				>
					<ListIcon className="w-6 h-6" />
				</Button>
			)}

			<HStack centered>
				<Logo size={50} />
				<h1 className="text-2xl font-bold">Degree Audit Plus</h1>
			</HStack>
			<HStack centered>
				<IconButton
					fill="outline"
					icon={<ExportIcon className="w-6 h-6" />}
					label="Share"
				/>
				<IconButton
					fill="outline"
					icon={<RepeatIcon className="w-6 h-6" />}
					label="Reload"
				/>
				<IconButton
					fill="outline"
					icon={<GearIcon className="w-6 h-6" />}
					label="Settings"
				/>
			</HStack>
		</HStack>
	);
};

export default Navbar;
