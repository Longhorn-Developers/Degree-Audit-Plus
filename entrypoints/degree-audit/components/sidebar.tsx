import DegreeAuditCard from "@/entrypoints/components/audit-card";
import { usePreferences } from "@/entrypoints/providers/main-page";
import { DegreeAuditCardProps } from "@/lib/general-types";
import { getAuditHistory } from "@/lib/storage";
import dapLogo from "@/public/dap-logo.png";
import lhdLogo from "@/public/icon/LHD Logo.png";
import {
	ArrowSquareOut,
	DiscordLogo,
	Gear,
	GithubLogo,
	InstagramLogo,
	LinkedinLogo,
	Moon,
	Plus,
	Sidebar as SidebarIcon,
} from "@phosphor-icons/react";
import clsx from "clsx";
import React, { useState } from "react";
import { useAuditContext } from "./audit-provider";

const Sidebar = () => {
	const { sidebarIsOpen, toggleSidebar } = usePreferences();
	const { currentAuditId, setCurrentAuditId, progresses } = useAuditContext();
	const [audits, setAudits] = useState<DegreeAuditCardProps[]>([]); //history
	const [loading, setLoading] = useState(true);

	React.useEffect(() => {
		async function loadAudits() {
			try {
				const data = await getAuditHistory();
				if (data && !data.error) {
					setAudits(data.audits);
				}
			} catch (e) {
				console.error("Error loading audit history:", e);
			} finally {
				setLoading(false);
			}
		}
		loadAudits();
	}, []);

	return (
		<div
			className={clsx(
				"py-5 h-full min-h-screen flex flex-col fixed left-0 top-0 bg-white border-r border-[var(--color-dap-border)] overflow-hidden whitespace-nowrap transition-[width] duration-300 ease-out",
				{
					"w-[375px]": sidebarIsOpen,
					"w-0 pointer-events-none": !sidebarIsOpen,
				}
			)}
			aria-hidden={!sidebarIsOpen}
			{...(!sidebarIsOpen ? { inert: true } : {})}
		>
			{/* Header */}
			<div className="px-8 pb-4 flex items-center justify-between gap-4 w-full">
				<div className="flex items-center gap-2">
					<img src={dapLogo} alt="DAP Logo" className="w-12 h-12" />
					<span className="text-dap-orange font-semibold text-xl">
						Degree Audit Plus
					</span>
				</div>
				<button
					className="p-1 hover:bg-black/5 rounded"
					onClick={toggleSidebar}
				>
					<SidebarIcon size={24} className="text-[var(--color-dap-dark-alt)]" />
				</button>
			</div>

			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto px-8">
				{/* MY AUDITS Section */}
				<div className="flex items-center justify-between">
					<span className="text-[19px] font-bold text-[var(--color-dap-dark-heading)] tracking-[-0.19px]">
						MY AUDITS
					</span>
					<button className="p-1 hover:bg-black/5 rounded">
						<Plus size={24} className="text-[var(--color-dap-dark-alt)]" />
					</button>
				</div>

				<div className="mt-2 flex flex-col gap-3">
					{loading ? (
						<p className="text-sm text-gray-500">Loading audits...</p>
					) : audits.length === 0 ? (
						<p className="text-sm text-gray-500">No audits found</p>
					) : (
						audits.map((audit, index) => {
							const id = audit.auditId || String(index);
							return (
								<DegreeAuditCard
									key={id}
									title={audit.title}
									majors={audit.majors}
									minors={audit.minors}
									percentage={audit.percentage}
									isSelected={currentAuditId === id}
									isExpanded={currentAuditId === id}
									onToggle={() => {
										if (audit.auditId) {
											setCurrentAuditId(audit.auditId); // No page refresh, just update state
										}
									}}
									onMenuClick={() => {
										console.log("Menu clicked for", audit.title);
									}}
								/>
							);
						})
					)}
				</div>

				{/* Divider */}
				<hr className="my-5 border-[var(--color-dap-border)]" />

				{/* RESOURCES Section */}
				<div className="text-[25px] font-bold text-[var(--color-dap-dark-heading)] tracking-[-0.19px]">
					RESOURCES
				</div>
				<div className="mt-3 flex flex-col gap-2 ">
					<a
						href="#"
						className="text-[var(--color-dap-orange)] text-[15px] font-medium hover:underline flex items-center gap-1"
					>
						UT Core Requirements <ArrowSquareOut size={14} />
					</a>
					<a
						href="#"
						className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
					>
						UT Degree Plans <ArrowSquareOut size={14} />
					</a>
					<a
						href="#"
						className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
					>
						Registration Info Sheet (RIS) <ArrowSquareOut size={14} />
					</a>
					<a
						href="#"
						className="text-[#bf5700] text-[15px] font-medium hover:underline flex items-center gap-1"
					>
						Register for Courses <ArrowSquareOut size={14} />
					</a>
				</div>

				{/* Divider */}
				<hr className="my-5 border-[var(--color-dap-border)]" />

				{/* Feedback Link */}
				<a
					href="#"
					className="text-[var(--color-dap-orange)] font-semibold hover:underline flex items-center gap-1"
				>
					Send us Feedback! <ArrowSquareOut size={14} />
				</a>
			</div>

			{/* Footer */}
			<div className="px-8 pt-6 pb-4">
				<div className="flex items-center gap-2 mb-4">
					<img src={lhdLogo} alt="Longhorn Developers" className="w-6 h-6" />
					<div className="text-sm">
						<span className="text-[var(--color-dap-orange)] font-semibold">
							MADE WITH LOVE, BY
						</span>
						<br />
						<span className="text-[var(--color-dap-orange)] font-semibold">
							LONGHORN DEVELOPERS
						</span>
					</div>
				</div>
				<div className="flex items-center justify-start gap-4 text-[var(--color-dap-dark)]">
					<a href="#" aria-label="Discord">
						<DiscordLogo size={24} />
					</a>
					<a href="#" aria-label="Instagram">
						<InstagramLogo size={24} />
					</a>
					<a href="#" aria-label="LinkedIn">
						<LinkedinLogo size={24} />
					</a>
					<a href="#" aria-label="GitHub">
						<GithubLogo size={24} />
					</a>
					<a href="#" aria-label="Dark Mode">
						<Moon size={24} />
					</a>
					<a href="#" aria-label="Settings">
						<Gear size={24} />
					</a>
				</div>
			</div>
		</div>
	);
};

export default Sidebar;
