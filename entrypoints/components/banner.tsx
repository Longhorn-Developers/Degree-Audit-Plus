import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import ArrowTopRightIcon from "../../assets/svgs/arrow-top-right";
import DAPLogo from "../../assets/svgs/dap-logo";
import gridBg from "../../assets/Grid.png";
import noiseTexture from "../../assets/noise-texture.svg";
import { XIcon } from "@phosphor-icons/react";

const TryDAPBanner = () => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
  };
  return (
    <div>
      {isOpen && (
        <div className="relative w-full overflow-hidden 20 rounded-t-md">
          <div
            className="bg-dap-primary relative w-full h-[150px] p-4 z-[2] flex justify-start items-center gap-6 flex-row text-white"
            style={{
              backgroundImage: `url(${gridBg})`,
              backgroundSize: "auto",
              backgroundPosition: "center",
              backgroundRepeat: "repeat",
            }}
          >
            {/* Noise texture overlay */}
            <img
              src={noiseTexture}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[0] opacity-70"
            />
            <div className="relative z-10">
              <DAPLogo />
            </div>
            <div className="flex flex-col gap-2 relative z-10">
              <h2
                className="font-staatliches text-[54.976px] font-normal leading-[49.949px] tracking-[-0.55px]"
                style={{
                  fontFamily: "Staatliches, cursive",
                  fontStyle: "normal",
                  fontWeight: 400,
                }}
              >
                Try degree audit plus
              </h2>
              <p className="font-medium text-[15.784px] leading-normal">
                Take control of your degree plan with real-time progress, visual
                tracking, and flexible planning tools.
              </p>
            </div>
            <button className="flex items-center gap-2 text-black absolute right-12 top-[55%] -translate-y-1/2 bg-white rounded-md px-4 py-2 cursor-pointer transition-all duration-300 ease-in-out transform scale-100 origin-center z-10 h-[44px]">
              <ArrowTopRightIcon className="w-6 h-6" />
              <span className="font-semibold">Try it now!</span>
            </button>

            <button
              className="text-white h-8 w-8 flex items-center justify-center cursor-pointer absolute right-4 top-4 z-10 hover:opacity-70 transition-opacity"
              onClick={handleClose}
              aria-label="Close banner"
            >
              {" "}
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full h-[12px] bg-[#F8971F]" />

          <div className="w-full h-[6px] bg-[#FFD600]" />
        </div>
      )}
    </div>
  );
};

export default TryDAPBanner;
