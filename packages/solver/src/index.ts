export interface Meeting {
  day_of_week: number;
  start_minute: number;
  end_minute: number;
}
export interface Candidate {
  id: string;
  course_id: string;
  credits: number;
  seats_available: number;
  meetings: Meeting[];
}
export function overlaps(a: Meeting, b: Meeting) {
  return (
    a.day_of_week === b.day_of_week &&
    a.start_minute < b.end_minute &&
    b.start_minute < a.end_minute
  );
}
export function eligible(groups: string[][], completed: Set<string>) {
  return groups.every((group) => group.some((course) => completed.has(course)));
}
export function attendanceSummary(records: { status: string }[], threshold = 75) {
  const held = records.filter((record) => record.status !== "cancelled");
  const attended = held.filter((record) => record.status === "attended").length;
  return {
    total: held.length,
    attended,
    percent: held.length ? Math.round((attended / held.length) * 100) : null,
    canMiss: held.length ? Math.max(0, Math.floor((attended * 100) / threshold - held.length)) : 0,
  };
}
export function degreeCredits(
  courses: { id: string; credits: number }[],
  completed: { course_id: string; status: string }[],
) {
  const ids = new Set(
    completed.filter((record) => record.status === "completed").map((record) => record.course_id),
  );
  return courses
    .filter((course) => ids.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
}
export function generatePlans(
  courseIds: string[],
  candidates: Candidate[],
  preferences: { avoidEarly?: boolean; compact?: boolean; maxCredits?: number } = {},
) {
  if (!courseIds.length || new Set(courseIds).size !== courseIds.length || courseIds.length > 12)
    return [];
  const options = courseIds.map((id) =>
    candidates.filter(
      (candidate) =>
        candidate.course_id === id &&
        candidate.seats_available > 0 &&
        candidate.meetings.length > 0,
    ),
  );
  if (options.some((list) => !list.length)) return [];
  const results: { sections: Candidate[]; credits: number; score: number }[] = [];
  let visited = 0;
  function visit(index: number, chosen: Candidate[], credits: number) {
    if (++visited > 50000) return;
    if (index === options.length) {
      const meetings = chosen.flatMap((section) => section.meetings);
      const early = meetings.filter((meeting) => meeting.start_minute < 9 * 60).length;
      const days = new Set(meetings.map((meeting) => meeting.day_of_week)).size;
      results.push({
        sections: [...chosen],
        credits,
        score: (preferences.avoidEarly ? early * 100 : 0) + (preferences.compact ? days * 10 : 0),
      });
      return;
    }
    for (const candidate of options[index]) {
      if (credits + candidate.credits > (preferences.maxCredits ?? 18)) continue;
      if (
        candidate.meetings.some((meeting, i) =>
          candidate.meetings.some((other, j) => i < j && overlaps(meeting, other)),
        )
      )
        continue;
      if (
        chosen.some((section) =>
          section.meetings.some((a) => candidate.meetings.some((b) => overlaps(a, b))),
        )
      )
        continue;
      chosen.push(candidate);
      visit(index + 1, chosen, credits + candidate.credits);
      chosen.pop();
    }
  }
  visit(0, [], 0);
  return results.sort((a, b) => a.score - b.score).slice(0, 3);
}
