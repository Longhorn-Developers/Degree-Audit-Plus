import DAPLogo from "@/assets/svgs/dap-circle-logo";
import type { DegreeAuditCardProps } from "@/lib/general-types";
import { getAuditHistory } from "@/lib/storage";
import { PlusIcon, SpinnerIcon } from "@phosphor-icons/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { browser } from "wxt/browser";
import { DegreeAuditCardPopup } from "../components/audit-card";
import Button from "../components/common/button";
import "./style.css";
// import HypotheticalCourseModal, {
//   type HypotheticalCourse,
// } from "../components/hypothetical-course-modal";

// Check if user is authenticated to UTDirect by fetching a page and checking for login form
async function checkUTDirectAuth(): Promise<boolean> {
	try {
		const res = await fetch("https://utdirect.utexas.edu/apps/degree/audits/");
		const html = await res.text();
		// If page contains password input or login form, user is not authenticated
		return !html.includes('type="password"') && !html.includes('action="/idp/');
	} catch {
		return false;
	}
}

export default function App() {
	const [audits, setAudits] = React.useState<DegreeAuditCardProps[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [showAll, setShowAll] = React.useState(false);
	const [runningAudit, setRunningAudit] = React.useState(false);
	const [isSyncing, setIsSyncing] = React.useState(false);
	const [isAuthenticated, setIsAuthenticated] = React.useState(true);
	// const [isModalOpen, setIsModalOpen] = React.useState(false);
	// const [hypotheticalCourses, setHypotheticalCourses] = React.useState<
	//   HypotheticalCourse[]
	// >([]);
	// Load audit history from cached storage
	// Storage is updated ONLY when user visits UT Direct audits home page
	// This allows popup to work from any page using cached data
	const UT_AUDIT_URL =
		"https://utdirect.utexas.edu/apps/degree/audits/submissions/student_individual/";
	React.useEffect(() => {
		async function loadAudits() {
			try {
				console.log("Popup: Loading audit history from cached storage...");
				const data = await getAuditHistory();
				console.log("Popup: Storage data:", data);

				if (data) {
					if (data.error) {
						console.error("Popup: Stored error:", data.error);
						setError(data.error);
						setAudits([]);
					} else {
						console.log("Popup: Loaded audits from cache:", data.audits);
						setAudits(data.audits);
						setError(null);
					}
				} else {
					console.log("Popup: No audit history in cache go to the ");
				}
			} catch (e) {
				console.error("Error loading audit history:", e);
				setError("Failed to load audit history");
			} finally {
				setLoading(false);
			}
		}

		loadAudits();
		checkUTDirectAuth().then(setIsAuthenticated);
	}, []);

	React.useEffect(() => {
		// get sycn status for ui
		browser.runtime
			.sendMessage({ type: "GET_SYNC_STATUS" })
			.then((response) => {
				if (response?.isSyncing) {
					setIsSyncing(true);
				}
			})
			.catch(() => {});

		const listener = (message: any) => {
			if (message.type === "SCRAPE_ALL_STARTED") {
				setIsSyncing(true);
			}
			if (message.type === "SCRAPE_ALL_COMPLETE") {
				setIsSyncing(false);
			}
		};

		browser.runtime.onMessage.addListener(listener);
		return () => browser.runtime.onMessage.removeListener(listener);
	}, []);

	const handleOpenDegreeAuditPage = (auditId: string | undefined) => {
		browser.runtime.sendMessage({
			action: "openDegreeAudit",
			auditId: auditId,
		});
	};

	const injectClicker = async (tabId: number) => {
		await browser.scripting.executeScript({
			target: { tabId },
			func: () => {
				const clickWhenReady = () => {
					const click = () => {
						const btn =
							document.querySelector<HTMLButtonElement>(".run_button");
						if (btn) {
							btn.click();
							return true;
						}
						return false;
					};

					if (click()) return;

					let tries = 0;
					const maxTries = 120;
					const iv = setInterval(() => {
						if (click() || ++tries >= maxTries) clearInterval(iv);
					}, 500);

					const mo = new MutationObserver(() => {
						if (click()) mo.disconnect();
					});
					mo.observe(document.documentElement, {
						childList: true,
						subtree: true,
					});

					setTimeout(() => {
						const isLogin =
							document.querySelector('input[type="password"]') ||
							document.querySelector(
								'form[action*="logon"], form[action*="login"]'
							);
						if (isLogin) {
							console.warn(
								"UTDirect login detected. Please sign in; the audit will run afterward."
							);
						}
					}, 1500);
				};

				if (document.readyState === "complete") clickWhenReady();
				else window.addEventListener("load", clickWhenReady, { once: true });
			},
		});
	};

	const handleRerunAudit = async () => {
		console.log("Popup: Rerun audit button clicked");
		setRunningAudit(true);

		const tabs = await browser.tabs.query({ url: "*://utdirect.utexas.edu/*" }); // WARNING: this is broken. browser.tabs is null and being run in the tab's console.
		const exactAuditTab = tabs.find((t) => t.url?.startsWith(UT_AUDIT_URL));
		if (exactAuditTab?.id) {
			console.log("Popup: Injecting clicker into existing tab");
			await injectClicker(exactAuditTab.id);
			setRunningAudit(false);
			return;
		} else {
			console.log("Popup: No existing tab found, creating new tab");
		}
		const newTab = await browser.tabs.create({
			url: UT_AUDIT_URL,
			active: false,
		});

		// Safety timeout - close tab after 30 seconds if nothing happens
		const safetyTimeout = setTimeout(() => {
			if (newTab.id) browser.tabs.remove(newTab.id);
			setRunningAudit(false);
		}, 30000);

		const listener = async (tabId: number, info: any) => {
			if (tabId === newTab.id && info.status === "complete") {
				browser.tabs.onUpdated.removeListener(listener);
				await injectClicker(tabId);
			}
		};

		browser.tabs.onUpdated.addListener(listener);

		// Listen for storage changes - when audit completes, storage will update
		const storageListener = (changes: any) => {
			if (changes.auditHistory) {
				console.log("Popup: Audit complete! Storage updated.");
				// Clear safety timeout
				clearTimeout(safetyTimeout);
				// Close the background tab
				if (newTab.id) browser.tabs.remove(newTab.id);
				// Reload audit history
				async function reload() {
					try {
						const data = await getAuditHistory();
						if (data) {
							if (data.error) {
								setError(data.error);
								setAudits([]);
							} else {
								setAudits(data.audits);
								setError(null);
							}
						}
					} catch (e) {
						console.error("Error reloading audit history:", e);
					} finally {
						setRunningAudit(false);
					}
				}
				reload();
				// Remove this listener
				browser.storage.onChanged.removeListener(storageListener);
			}
		};

		browser.storage.onChanged.addListener(storageListener);
	};

	// Determine which audits to display
	const displayedAudits = showAll ? audits : audits.slice(0, 3);
	const hasMoreAudits = audits.length > 3;

	// const handleAddHypotheticalCourse = (course: HypotheticalCourse) => {
	//   console.log("Adding hypothetical course:", course);
	//   setHypotheticalCourses((prev) => [...prev, course]);
	//   // TODO: Store in browser storage and send to degree audit page
	// };

	return (
		<div className="w-[438px] h-full min-h-[300px] max-h-[600px] bg-white font-sans overflow-hidden flex flex-col border border-gray-100">
			<header className="flex justify-between items-center p-3 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center space-x-2">
					<DAPLogo />
					<span className="font-bold text-lg text-dap-primary leading-tight">
						Degree Audit
						<br />
						Plus
					</span>
				</div>

				<div className="flex items-center space-x-3">
					{isAuthenticated ? (
						<Button className="rounded-md" onClick={handleRerunAudit}>
							{runningAudit ? (
								<div className="flex items-center space-x-2">
									<SpinnerIcon size={24} className="animate-spin-slow" />
									<p className="text-lg font-bold">Running Audit...</p>
								</div>
							) : (
								<div className="flex items-center space-x-2">
									<PlusIcon size={24} />
									<p className="text-lg font-bold">Run New Audit</p>
								</div>
							)}
						</Button>
					) : (
						<Button
							className="rounded-md"
							onClick={() =>
								browser.tabs.create({ url: "https://utdirect.utexas.edu/" })
							}
						>
							<p className="text-lg font-bold">Login to UTDirect</p>
						</Button>
					)}
				</div>
			</header>

			<main className="p-5 pt-4 overflow-y-auto flex-1">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-3">
						<h1
							style={{ fontFamily: "Roboto Flex" }}
							className="text-[25.63px] font-bold text-[#1a2024]"
						>
							Current Audits
						</h1>
						{isSyncing && (
							<div className="flex items-center gap-1.5 text-[#9cadb7]">
								<SpinnerIcon size={14} className="animate-spin" />
								<span className="text-xs">Syncing...</span>
							</div>
						)}
					</div>
					{/* <Button
            size="small"
            color="orange"
            fill="outline"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <PlusIcon size={16} />
            <span className="text-sm">Hypothetical</span>
          </Button> */}
				</div>

				{loading ? (
					<div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
						<p className="text-base text-[#9cadb7]">Loading audit history...</p>
					</div>
				) : error ? (
					<div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
						<p className="text-base text-red-600 max-w-[250px]">
							Error loading audits: {error}
						</p>
						<p className="text-sm text-[#9cadb7]">
							Please visit the UT Direct degree audits page to refresh.
						</p>
					</div>
				) : audits.length === 0 ? (
					<div className="flex flex-col gap-2 items-center justify-center text-center mb-6 py-8">
						<p className="text-base text-[#9cadb7] tracking-[0.32px] max-w-[250px]">
							Alas! Your future is veiled. I do not know what is to come.
						</p>
						<p className="text-[14.22px] font-medium text-[#333f48]">
							(No current audits)
						</p>
					</div>
				) : (
					<>
						<div className="space-y-4 mb-4">
							{displayedAudits.map((audit, index) => (
								<div
									key={index}
									onClick={(e) => {
										e.stopPropagation();
										handleOpenDegreeAuditPage(audit?.auditId);
									}}
								>
									<DegreeAuditCardPopup
										title={audit.title}
										majors={audit.majors}
										minors={audit.minors}
										percentage={audit.percentage}
									/>
								</div>
							))}
						</div>
						{hasMoreAudits && (
							<button
								onClick={() => setShowAll(!showAll)}
								className="w-full text-center text-[#0066cc] font-medium text-sm mb-1 hover:underline hover:cursor-pointer"
							>
								{showAll ? "Show Less" : `Show ${audits.length - 3} More`}
							</button>
						)}
					</>
				)}
			</main>

			{/* Hypothetical Course Modal */}
			{/* <HypotheticalCourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddHypotheticalCourse}
      /> */}
		</div>
	);
}

// Only render if we're in the standalone popup context (not injected via content script)
const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
}
