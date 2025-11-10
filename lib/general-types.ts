export type Progress = {
	current: number;
	total: number;
};

export type DoneAndWorkingAndUnmetRequirementsProgress = {
	done: number;
	working: number;
	unmet: number;
};

export type RequirementBreakdownProps = {
	title: string;
	hours: Progress;
	credits: Progress;
	courses: Course[];
};

export type Course = {
	code: string;
	name: string;
	hours: number;
	credits: number;
	semester: string;
	grade: string;
	status: "Completed" | "In Progress" | "Not Started";
};
