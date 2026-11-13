// Synthetic data only; no student account or session information.
export function connectFixture() {
  const courses = [
    ["CSE330", 101, 3, "THEORY", null, "14:00:00", "15:20:00"],
    ["CSE260", 102, 3, "THEORY", null, "08:00:00", "09:20:00"],
    ["MAT215", 103, 3, "THEORY", null, "09:30:00", "10:50:00"],
    ["CSE220", 104, 3, "THEORY", null, "11:00:00", "12:20:00"],
    ["CSE330L", 105, 0, "LAB", 101, "14:00:00", "16:50:00"],
    ["CSE260L", 106, 0, "LAB", 102, "08:00:00", "10:50:00"],
    ["CSE220L", 107, 0, "LAB", 104, "11:00:00", "13:50:00"],
  ] as const;
  return courses.map(
    (
      [courseCode, sectionId, courseCredit, courseType, parentSectionId, startTime, endTime],
      index,
    ) => ({
      courseId: 1000 + index,
      courseCode,
      sectionId,
      courseCredit,
      courseType,
      parentSectionId,
      sectionName: "01",
      faculties: courseType === "LAB" ? "TBA" : "DEMO",
      roomName: "DEMO-101",
      capacity: 40,
      consumedSeat: courseCode === "MAT215" ? 41 : 36,
      semesterSessionId: 20263,
      studentPortfolioId: 99999,
      sectionSchedule: JSON.stringify({
        classStartDate: "2026-10-03",
        classEndDate: "2027-01-04",
        classSchedules: (courseType === "LAB" ? ["TUESDAY"] : ["MONDAY", "WEDNESDAY"]).map(
          (day) => ({ day, startTime, endTime }),
        ),
        midExamDate: courseType === "LAB" ? null : "2026-11-25",
        midExamStartTime: courseType === "LAB" ? null : "11:00:00",
        midExamEndTime: courseType === "LAB" ? null : "13:00:00",
        finalExamDate: courseType === "LAB" ? null : "2027-01-11",
        finalExamStartTime: courseType === "LAB" ? null : "11:00:00",
        finalExamEndTime: courseType === "LAB" ? null : "13:00:00",
      }),
    }),
  );
}
