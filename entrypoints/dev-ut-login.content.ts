import { submitDevUtLogin } from "@/lib/dev-ut-login";

declare const __UT_DEV_LOGIN__: { eid: string; password: string } | null;

export default defineContentScript({
  matches: ["https://enterprise.login.utexas.edu/idp/profile/*"],
  main() {
    if (__UT_DEV_LOGIN__) {
      submitDevUtLogin(document, window.sessionStorage, __UT_DEV_LOGIN__);
    }
  },
});
