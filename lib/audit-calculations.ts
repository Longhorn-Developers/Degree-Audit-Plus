import type {
	PlanableProgress,
	Progress,
	RequirementSection,
} from "./general-types";

export type CurrentAuditProgress = {
	total: Progress;
	sections: {
		title: string;
		progress: PlanableProgress;
	}[];
};

export function calculateWeightedDegreeCompletion(
	sections: RequirementSection[]
): CurrentAuditProgress {
	const results: CurrentAuditProgress = {
		total: { current: 0, total: 0 },
		sections: [],
	};
	sections.forEach((section) => {
		const sectionProgress = {
			title: section.title,
			progress: { current: 0, planned: 0, total: 0 },
		};
		sectionProgress.progress.total = section.rules.reduce(
			(acc, rule) => acc + rule.requiredHours,
			0
		);

		section.rules.forEach((rule) => {
			rule.courses.forEach((course) => {
				if (course.status !== "Planned") {
					sectionProgress.progress.current += course.hours ?? 0;
				} else {
					sectionProgress.progress.planned += course.hours ?? 0;
				}
			});
		});

		results.sections.push(sectionProgress);
	});
	results.total.current = results.sections.reduce(
		(acc, section) => acc + section.progress.current,
		0
	);
	results.total.total = results.sections.reduce(
		(acc, section) => acc + section.progress.total,
		0
	);
	return results;
}
