// Plain messages for the error codes the background sends back.
const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Log in to UT Direct and try again.",
  COURSE_NOT_FOUND: "UT doesn't offer this course next semester.",
  TOPIC_REQUIRED: "Topics courses can't be checked yet.",
  RUN_TIMEOUT: "UT took too long to run the audit. Try again.",
  MAIN_AUDIT_NOT_FOUND: "Run an audit of your degree first, then try again.",
  NO_PREVIEW: "This preview is out of date. Click the course again.",
  NOT_PREVIEWABLE:
    "Courses can't be checked against this audit. Run a new audit and try again.",
};

export function getErrorMessage(error: string | undefined): string {
  if (!error) return "Something went wrong. Try again.";
  return ERROR_MESSAGES[error] ?? `Something went wrong (${error}).`;
}
