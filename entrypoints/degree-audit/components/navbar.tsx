import Button, {
	IconButton,
	ToggleSwitch,
} from "@/entrypoints/components/common/button";
import { HStack, VStack } from "@/entrypoints/components/common/helperdivs";
import { usePreferences } from "@/entrypoints/providers/main-page";
import { ExportIcon, GearIcon, ListIcon } from "@phosphor-icons/react";

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
	const { toggleSidebar, sidebarIsOpen, toggleViewMode, viewMode } =
		usePreferences();

	return (
		<HStack
			fill
			x="between"
			y="middle"
			className="border-b-2 border-gray-100 px-10 py-2"
			style={{
				height: "75px",
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
					<h1 className="my-2 font-bold text-2xl">Degree Audit Plus</h1>
					{/* <Substack>
            <Subtitle text="Major: " />
            <Subtitle text="Minor/cert: " />
          </Substack> */}
				</VStack>
			</HStack>

			<HStack centered>
				<label htmlFor="wipe-all-planned-courses">
					{viewMode === "audit" ? "Audit View" : "Planner View"}
				</label>
				<ToggleSwitch
					onChange={async () => await toggleViewMode()}
					checked={viewMode === "planner"}
				/>
				<IconButton icon={<ExportIcon className="w-6 h-6" />} label="Share" />
				<IconButton icon={<GearIcon className="w-6 h-6" />} label="Settings" />
			</HStack>
		</HStack>
	);
};

export default Navbar;
