import Button, { IconButton } from "@/entrypoints/components/common/button";
import {
	HStack,
	Substack,
	VStack,
} from "@/entrypoints/components/common/helperdivs";
import { Subtitle } from "@/entrypoints/components/common/text";
import { usePreferences } from "@/entrypoints/providers/main-page";
import { ExportIcon, GearIcon, ListIcon } from "@phosphor-icons/react";
import { Title } from "../../components/common/text";

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
			x="between"
			y="middle"
			className="border-b-4 border-gray-800 px-10 py-2"
			style={{
				height: "150px",
			}}
		>
			<HStack centered>
				{!sidebarIsOpen && (
					<Button
						className="p-2 rounded-full"
						fill="none"
						onClick={async () => await toggleSidebar()}
					>
						<ListIcon className="w-6 h-6" />
					</Button>
				)}
				<VStack gap={0}>
					<Title text="Degree Audit Plus" className="my-2" />
					<Substack>
						<Subtitle text="Major: " />
						<Subtitle text="Minor/cert: " />
					</Substack>
				</VStack>
			</HStack>

			<HStack centered>
				<IconButton icon={<ExportIcon className="w-6 h-6" />} label="Share" />
				<IconButton icon={<GearIcon className="w-6 h-6" />} label="Settings" />
			</HStack>
		</HStack>
	);
};

export default Navbar;
