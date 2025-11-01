import { motion } from "framer-motion";
import ArrowTopRightIcon from "~/assets/svgs/arrow-top-right";
import LHDLogo from "~/assets/svgs/lhd-logo";
import Button from "~/entrypoints/components/common/button";
import { openDAPMainPage } from "~/lib/utils";
import { HStack } from "./common/helperdivs";

const TryDAPBanner = () => {
	return (
		<motion.div
			className="hover:bg-red-500 bg-dap-primary relative w-full p-4 flex justify-start items-center gap-6 flex-row text-white shadow-lg shadow-black/20 rounded-md overflow-hidden"
			initial={{ opacity: 0, y: 100 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -100 }}
			transition={{ duration: 0.3 }}
		>
			<HStack x="between" y="stretch" className="h-full w-full">
				<HStack x="left" y="middle" className="flex-1">
					<div className="relative z-10">
						<LHDLogo />
					</div>
					<div className="flex flex-col gap-2 relative z-10">
						<h2 className="text-5xl font-bold font-header-title">
							Open Degree Audit Plus
						</h2>
						<p className="text-base font-normal">
							Take control of your degree plan with real-time progress, visual
							tracking, and flexible planning tools.
						</p>
					</div>
				</HStack>
				<HStack x="right" y="bottom">
					<Button onClick={openDAPMainPage} color="white">
						<ArrowTopRightIcon className="w-8 h-8" /> Open Degree Audit Plus
					</Button>
				</HStack>
			</HStack>
		</motion.div>
	);
};

export default TryDAPBanner;
