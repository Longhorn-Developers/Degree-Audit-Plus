import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { browser } from "wxt/browser";
import "~/entrypoints/styles/content.css";
import ArrowTopRightIcon from "../../assets/svgs/arrow-top-right";
import LHDLogo from "../../assets/svgs/lhd-logo";

const TryDAPBanner = () => {
  const [isOpen, setIsOpen] = useState(true);
  
  const handleOpenDegreeAuditPage = () => {
    browser.runtime.sendMessage({ action: "open-dap" });
  };
  
  const handleClose = () => {
    setIsOpen(false);
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="bg-dap-primary relative w-full p-4 pb-14 flex justify-start items-center gap-6 flex-row text-white shadow-lg shadow-black/20 rounded-md overflow-hidden"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.3 }}
        >
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
          <button 
            onClick={handleOpenDegreeAuditPage}
            className="flex items-center gap-2 text-black absolute right-4 bottom-4 bg-white rounded-lg px-2 py-1 cursor-pointer border-none outline-none shadow-none transition-all duration-300 ease-in-out transform scale-100 origin-center z-10"
          >
            <ArrowTopRightIcon className="w-8 h-8" /> Open
          </button>
          <button
            className="text-white h-8 w-8 flex items-center justify-center cursor-pointer absolute right-4 top-4 z-10"
            onClick={handleClose}
          ></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TryDAPBanner;
