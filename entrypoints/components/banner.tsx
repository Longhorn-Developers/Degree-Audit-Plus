import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import ArrowTopRightIcon from "../../assets/svgs/arrow-top-right";
import DAPLogo from "../../assets/svgs/dap-logo";
import gridBg from "../../assets/Grid.png";

const TryDAPBanner = () => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };
  return (
    <div>
      {isOpen && (
        <div
          className="relative w-full overflow-hidden shadow-lg shadow-black/20"
          style={{
            borderTopLeftRadius: "6px",
            borderTopRightRadius: "6px",
          }}
        >
          {/* Main content area */}
          <div
            className="bg-dap-primary relative w-full h-[150px] p-4 flex justify-start items-center gap-6 flex-row text-white"
            style={{
              backgroundImage: `url(${gridBg})`,
              backgroundSize: "auto",
              backgroundPosition: "center",
              backgroundRepeat: "repeat",
            }}
          >
            <div className="relative z-10">
              <DAPLogo />
            </div>
            <div className="flex flex-col gap-2 relative z-10">
              <h2
                style={{
                  color: "#FFF",
                  fontFamily: "Staatliches, cursive",
                  fontSize: "54.976px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "49.949px",
                  letterSpacing: "-0.55px",
                }}
              >
                TRY DEGREE AUDIT PLUS
              </h2>
              <p className="text-base font-normal">
                Take control of your degree plan with real-time progress, visual
                tracking, and flexible planning tools.
              </p>
            </div>
            <button className="flex items-center gap-2 text-black absolute right-8 top-1/2 -translate-y-1/2 bg-white rounded-md px-4 py-2 cursor-pointer transition-all duration-300 ease-in-out transform scale-100 origin-center z-10 h-[44px]">
              <ArrowTopRightIcon className="w-6 h-6" />
              <span className="font-semibold">Try it now!</span>
            </button>

            <button
              className="text-white h-8 w-8 flex items-center justify-center cursor-pointer absolute right-4 top-4 z-10 hover:opacity-70 transition-opacity"
              onClick={handleClose}
              aria-label="Close banner"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Yellow bottom border */}
          <div
            className="w-full"
            style={{ height: "12px", backgroundColor: "#F8971F" }}
          />

          {/* Gold bottom border */}
          <div
            className="w-full"
            style={{ height: "6px", backgroundColor: "#FFD600" }}
          />
        </div>
      )}
    </div>
  );
};

export default TryDAPBanner;
