import Button from "@/entrypoints/components/common/button";
import {
	HStack,
	Substack,
	VStack,
} from "@/entrypoints/components/common/helperdivs";
import { usePreferences } from "@/entrypoints/providers/main-page";
import {
	DiscordLogoIcon,
	GithubLogoIcon,
	InstagramLogoIcon,
	LinkedinLogoIcon,
	MoonIcon,
	NotebookIcon,
} from "@phosphor-icons/react";
import { useRef } from "react";
import devImage from "~/public/developer_image.png";
import logoImage from "~/public/logo_image.png";

const widthAnimationTime = 0.3;
const opacityAnimationTime = 0.1;

export const Sidebar = () => {
	const { sidebarSize, sidebarIsOpen, isDraggingSidebar } = usePreferences();

	return (
		<HStack
			className="h-full fixed left-0 top-0"
			style={{
				width: sidebarIsOpen ? sidebarSize : 0,
				opacity: sidebarIsOpen ? 1 : 0,
				transition: isDraggingSidebar
					? "none"
					: `width ${widthAnimationTime}s ease-in-out, opacity ${opacityAnimationTime}s ease-in-out`,
			}}
		>
			<SidebarContent />
			<SidebarResizeHandle />
		</HStack>
	);
};

const SidebarResizeHandle = () => {
	const {
		ephemeralSetSidebarSize,
		setAndSaveSidebarSize,
		setIsDraggingSidebar,
	} = usePreferences();

	const nextAnimationFrameRequestRef = useRef<number | null>(null);

	function mouseMove(e: MouseEvent) {
		e.preventDefault(); // Prevent text selection
		// Cancel any pending animation frame
		if (nextAnimationFrameRequestRef.current !== null) {
			cancelAnimationFrame(nextAnimationFrameRequestRef.current);
		}

		// Use requestAnimationFrame for smooth updates
		nextAnimationFrameRequestRef.current = requestAnimationFrame(() => {
			ephemeralSetSidebarSize(e.clientX);
		});
	}

	async function mouseUp(e: MouseEvent) {
		// Cancel any pending animation frame
		if (nextAnimationFrameRequestRef.current !== null) {
			cancelAnimationFrame(nextAnimationFrameRequestRef.current);
			nextAnimationFrameRequestRef.current = null;
		}

		document.body.style.cursor = "default";
		document.body.style.userSelect = ""; // Restore text selection
		document.removeEventListener("mousemove", mouseMove);
		document.removeEventListener("mouseup", mouseUp);
		setIsDraggingSidebar(false);
		await setAndSaveSidebarSize(e.clientX);
	}

	return (
		<div
			className="h-full bg-gray-200 hover:cursor-col-resize hover:bg-gray-300"
			style={{
				width: 4,
			}}
			onMouseDown={(e) => {
				e.preventDefault(); // Prevent text selection
				setIsDraggingSidebar(true);
				console.log("starting mouse move");
				document.body.style.cursor = "col-resize";
				document.body.style.userSelect = "none"; // Disable text selection

				document.addEventListener("mousemove", mouseMove);
				document.addEventListener("mouseup", mouseUp);
			}}
		/>
	);
};

const SidebarContent = () => {
	const { toggleSidebar } = usePreferences();

	return (
		<VStack className="w-full py-6 px-6" x="left" y="between" fill>
			{/* Header */}
			<HStack fill x="between" y="middle">
				<img src={logoImage} className="w-66" />
				<Button fill="none" onClick={toggleSidebar}>
					<NotebookIcon className="w-6 h-6" />
				</Button>
			</HStack>

			{/* Main Content */}
			<Substack y="top" className="w-full">
				<div className="mt-4 text-xl font-bold">MY AUDITS</div>
				<Substack gap={3}>
					<div className="bg-orange-100 rounded-xl p-4">
						<HStack y="middle" x="between">
							<div className="font-bold text-lg">Degree Audit 1</div>
							<div className="bg-[#b25d22] text-white px-3 py-1 rounded-md font-bold"></div>
						</HStack>
					</div>

					<div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FFFFFF] shadow-sm text-black">
						<HStack y="middle" gap={2}>
							<span className="text-lg">▾</span>
							<span className="font-semibold">what if i try this</span>
						</HStack>

						<HStack y="middle" gap={2}>
							<span className="text-xl font-bold"></span>
							<div className="bg-[#B45309] text-white px-3 py-1 rounded-md font-bold"></div>
						</HStack>
					</div>

					<div
						className="
          flex items-center justify-between
          px-4 py-3
          rounded-xl
          bg-[#FFFFFF]
          shadow-sm
          text-black
        "
					>
						<HStack y="middle" gap={2}>
							<span className="text-lg">▾</span>
							<span className="font-semibold">what if i try this</span>
						</HStack>

						<HStack y="middle" gap={2}>
							<span className="text-xl font-bold"></span>
							<div className="bg-[#B45309] text-white px-3 py-1 rounded-md font-bold"></div>
						</HStack>
					</div>
				</Substack>
			</Substack>

			{/* Footer */}
			<Substack useDefault className="w-full">
				<div className="text-xl font-bold">RESOURCES</div>

				<VStack className="mt-3 gap-2 text-orange-700 font-medium">
					<a href="#">UT Core Requirements ↗</a>
					<a href="#">UT Degree Plans ↗</a>
					<a href="#">Registration Info Sheet (RIS) ↗</a>
					<a href="#">Register for Courses ↗</a>
				</VStack>
				<div className="mt-8 text-orange-700 font-semibold">
					Send us Feedback! ↗
				</div>
				<VStack className="mt-10 mb-10 w-full">
					<img
						src={devImage}
						alt="Made with love by Longhorn Developers"
						className="w-56 mb-4"
					/>

					<HStack x="center" gap={6} className="mt-4 text-black" fill>
						<a href="#" aria-label="Discord">
							<DiscordLogoIcon size={28} />
						</a>

						<a href="#" aria-label="Instagram">
							<InstagramLogoIcon size={28} />
						</a>

						<a href="#" aria-label="LinkedIn">
							<LinkedinLogoIcon size={28} />
						</a>

						<a href="#" aria-label="GitHub">
							<GithubLogoIcon size={28} />
						</a>

						<a href="#" aria-label="Dark Mode">
							<MoonIcon size={28} />
						</a>
					</HStack>
				</VStack>
			</Substack>
		</VStack>
	);
};

export default Sidebar;

// const Sidebar = () => {
//   const { sidebarIsOpen, toggleSidebar } = usePreferences();
//   const maxWidth = 340;

//   return (
//     <VStack
//       className="h-full py-6 border-gray-200 fixed left-0 top-0 bg-white shadow-lg overflow-y-auto"
//       style={{
//         width: sidebarIsOpen ? maxWidth : 0,
//         opacity: sidebarIsOpen ? 1 : 0,
//         borderRightWidth: sidebarIsOpen ? 3 : 0,
//         transition: `width ${widthAnimationTime}s ease-in-out,
//                      opacity ${opacityAnimationTime}s ease-in-out,
//                      border-right-width ${widthAnimationTime}s ease-in-out`,
//       }}
//     >
//       <Button
//   className="p-2 rounded-full self-end mr-4"
//   fill="none"
//   onClick={toggleSidebar}
// >
// <HStack y="middle" gap={3}>
//           <img
//           src={logoImage}
//           className="w-66"
//           />
//         </HStack>
//   <NotebookIcon className="w-6 h-6" />
//       </Button>
//       <VStack className="px-6 py-2">
//       </VStack>
//       <div className="px-6 mt-4 text-xl font-bold">MY AUDITS</div>
//       <VStack className="px-4 mt-3 gap-3">
//         <div className="bg-orange-100 rounded-xl p-4">
//           <HStack y="middle" x="between">
//             <div className="font-bold text-lg">Degree Audit 1</div>
//             <div className="bg-[#b25d22] text-white px-3 py-1 rounded-md font-bold">
//             </div>
//           </HStack>
//         </div>

//         <div
//           className="
//             flex items-center justify-between
//             px-4 py-3
//             rounded-xl
//             bg-[#FFFFFF]
//             shadow-sm
//             text-black
//           "
//         >
//           <HStack y="middle" gap={2}>
//             <span className="text-lg">▾</span>
//             <span className="font-semibold">what if i try this</span>
//           </HStack>

//           <HStack y="middle" gap={2}>
//             <span className="text-xl font-bold"></span>
//             <div className="bg-[#B45309] text-white px-3 py-1 rounded-md font-bold">
//             </div>
//           </HStack>
//         </div>

//         <div
//         className="
//           flex items-center justify-between
//           px-4 py-3
//           rounded-xl
//           bg-[#FFFFFF]
//           shadow-sm
//           text-black
//         ">
//         <HStack y="middle" gap={2}>
//           <span className="text-lg">▾</span>
//           <span className="font-semibold">what if i try this</span>
//         </HStack>

//         <HStack y="middle" gap={2}>
//           <span className="text-xl font-bold"></span>
//           <div className="bg-[#B45309] text-white px-3 py-1 rounded-md font-bold">
//           </div>
//         </HStack>
//       </div>
//       </VStack>
//       <div className="px-6 mt-6 text-xl font-bold">RESOURCES</div>

//       <VStack className="px-6 mt-3 gap-2 text-orange-700 font-medium">
//         <a href="#">UT Core Requirements ↗</a>
//         <a href="#">UT Degree Plans ↗</a>
//         <a href="#">Registration Info Sheet (RIS) ↗</a>
//         <a href="#">Register for Courses ↗</a>
//       </VStack>
//       <div className="px-6 mt-8 text-orange-700 font-semibold">
//         Send us Feedback! ↗
//       </div>
//       <VStack className="px-6 mt-10 mb-10">
//         <img
//           src={devImage}
//           alt="Made with love by Longhorn Developers"
//           className="w-56 mb-4"
//         />

//         <HStack x="center" gap={6} className="mt-4 text-black">
//           <a href="#" aria-label="Discord">
//             <DiscordLogo size={28}/>
//           </a>

//           <a href="#" aria-label="Instagram">
//             <InstagramLogo size={28} />
//           </a>

//           <a href="#" aria-label="LinkedIn">
//             <LinkedinLogo size={28}/>
//           </a>

//           <a href="#" aria-label="GitHub">
//             <GithubLogo size={28}/>
//           </a>

//           <a href="#" aria-label="Dark Mode">
//             <Moon size={28}/>
//           </a>
//         </HStack>
//       </VStack>
//     </VStack>
//   );
// };
