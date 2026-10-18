// paste into devtools on any utdirect.utexas.edu planner page
// deletes EVERY planner row (all terms) using ut's own "Delete All Courses" action
(async () => {
  const VIEW =
    "https://utdirect.utexas.edu/apps/degree/audits/planner/view_planner/";
  const log = (...args) => console.log("[cleanup]", ...args);

  // main: count rows, hit delete all, reread to confirm
  log(`${await rowCount()} rows on planner, deleting all`);
  await fetch(VIEW + "?&action_code=A", {
    credentials: "include",
    redirect: "manual",
  });
  log(`done, ${await rowCount()} rows left`);

  // number of delete links on the planner = number of rows
  async function rowCount() {
    const response = await fetch(VIEW, {
      credentials: "include",
      redirect: "manual",
    });
    if (response.type === "opaqueredirect")
      throw new Error("logged out, log in and rerun");
    const doc = new DOMParser().parseFromString(
      await response.text(),
      "text/html",
    );
    return doc.querySelectorAll('a[href*="action_code=D"]').length;
  }
})();
