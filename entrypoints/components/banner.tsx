import { AnimatePresence, motion } from "framer-motion";
import logo from "~/public/icon/LHD Logo.png";

const TryDAPBanner = (): React.ReactNode => {
	const [isOpen, setIsOpen] = useState(true);

	const handleClose = () => {
		setIsOpen(false);
	};

	const handleOpen = () => {
		setIsOpen(true);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					style={{
						position: "relative",
						width: "100%",
						backgroundColor: "red",
						padding: "16px",
						display: "flex",
						justifyContent: "start",
						alignItems: "center",
						gap: "16px",
						flexDirection: "row",
					}}
					initial={{ opacity: 0, y: 100 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -100 }}
					transition={{ duration: 0.3 }}
				>
					<img src={logo} alt="Degree Audit Plus" className="w-10 h-10" />
					<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
						<h2 style={{ fontSize: "24px", fontWeight: "bold" }}>
							Degree Audit Plus
						</h2>
						<p style={{ fontSize: "16px", fontWeight: "normal" }}>
							Enhanced degree audit experience
						</p>
					</div>
					<button
						style={{
							backgroundColor: "transparent",
							position: "absolute",
							right: "16px",
							bottom: "16px",
							color: "white",
							padding: "4px 8px",
							cursor: "pointer",
							border: "none",
							outline: "none",
							boxShadow: "none",
							transition: "all 0.3s ease",
							transform: "scale(1)",
							transformOrigin: "center",
						}}
					>
						Try it now
					</button>
					<button
						style={{
							backgroundColor: "red",
							color: "white",
							padding: "4px 8px",
							cursor: "pointer",
							position: "absolute",
							right: "16px",
							top: "16px",
						}}
						onClick={handleClose}
					>
						X
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default TryDAPBanner;
