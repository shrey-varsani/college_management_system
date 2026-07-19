import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Course, Enrollment, Grade, User } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import { Award, Plus, Trash2, Edit2, CheckCircle2, UserCheck, Percent } from "lucide-react";
import toast from "react-hot-toast";

// Convert numeric grade average to standard Letter Grade & GPA Points
const getLetterAndPoints = (score: number) => {
  if (score >= 90) return { letter: "A", points: 4.0, color: "text-emerald-400 bg-emerald-500/10" };
  if (score >= 80) return { letter: "B", points: 3.0, color: "text-sky-400 bg-sky-500/10" };
  if (score >= 70) return { letter: "C", points: 2.0, color: "text-amber-400 bg-amber-500/10" };
  if (score >= 60) return { letter: "D", points: 1.0, color: "text-orange-400 bg-orange-500/10" };
  return { letter: "F", points: 0.0, color: "text-rose-400 bg-rose-500/10" };
};

export default function GradeBook() {
  const { user } = useSelector((state: RootState) => state.app);
  const queryClient = useQueryClient();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");

  // Form states for submitting scores
  const [component, setComponent] = useState<"Assignment" | "Midterm" | "Project" | "Exam">("Assignment");
  const [score, setScore] = useState<number>(85);
  const [weight, setWeight] = useState<number>(0.2);

  // Fetch courses
  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await api.get("/courses");
      return res.data;
    },
  });

  // Fetch enrollments
  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const res = await api.get("/enrollments");
      return res.data;
    },
  });

  // Fetch grades
  const { data: grades = [] } = useQuery<Grade[]>({
    queryKey: ["grades"],
    queryFn: async () => {
      const res = await api.get("/grades");
      return res.data;
    },
  });

  // Fetch users (to match student names)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
    enabled: user?.role === "faculty" || user?.role === "principal",
  });

  // Mutation to save a grade
  const saveGradeMutation = useMutation({
    mutationFn: async (data: { enrollmentId: string; component: string; score: number; weight: number }) => {
      return api.post("/grades", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Academic grade ledger updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to post grade entry");
    },
  });

  // Mutation to delete a grade
  const deleteGradeMutation = useMutation({
    mutationFn: async (gradeId: string) => {
      return api.delete(`/grades/${gradeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Grade retracted from records.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to retract grade record");
    },
  });

  // Calculate Weighted Grades for a specific enrollment
  const getCourseGradeMetrics = (enrollId: string) => {
    const courseGrades = grades.filter((g) => g.enrollmentId === enrollId);
    let totalScore = 0;
    let totalWeight = 0;

    courseGrades.forEach((g) => {
      totalScore += g.score * g.weight;
      totalWeight += g.weight;
    });

    const average = totalWeight > 0 ? totalScore / totalWeight : 0;
    const { letter, points, color } = getLetterAndPoints(average);

    return {
      average,
      totalWeight,
      letter,
      points,
      color,
      gradesList: courseGrades,
    };
  };

  // Student calculation
  const getStudentGPAMetrics = () => {
    if (!user) return { gpa: 0, totalCredits: 0 };
    const myEnrollments = enrollments.filter((e) => e.studentId === user.id && e.status === "active");
    
    let totalGradePoints = 0;
    let totalCredits = 0;

    myEnrollments.forEach((e) => {
      const course = courses.find((c) => c.id === e.courseId);
      if (course) {
        const { points, totalWeight } = getCourseGradeMetrics(e.id);
        if (totalWeight > 0) {
          totalGradePoints += points * course.credits;
          totalCredits += course.credits;
        }
      }
    });

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
    return { gpa, totalCredits };
  };

  const handlePostGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentId) {
      toast.error("Please select a student record first");
      return;
    }
    saveGradeMutation.mutate({
      enrollmentId: selectedEnrollmentId,
      component,
      score,
      weight,
    });
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (confirm("Are you sure you want to retract this grade?")) {
      deleteGradeMutation.mutate(gradeId);
    }
  };

  // Filter courses taught by active faculty
  const facultyCourses = courses.filter((c) => c.facultyId === user?.id);

  // Enrollments in selected course (for faculty portal)
  const courseEnrollments = enrollments.filter((e) => e.courseId === selectedCourseId);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-white">
          <Award className="h-6 w-6 text-indigo-500" />
          Academic Grade Book
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          {user?.role === "student"
            ? "View transcript averages and official semester GPA weights."
            : "Post official transcript component weights and view scholar analytics."}
        </p>
      </div>

      {/* STUDENT PORTAL TRANSCRIPT VIEW */}
      {user?.role === "student" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* GPA Card */}
          <div className="md:col-span-1 rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between items-center text-center">
            <div className="flex flex-col items-center">
              <span className="font-mono text-xs tracking-wider text-zinc-400 uppercase">Current Cumulative GPA</span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight text-indigo-400 font-sans">
                  {getStudentGPAMetrics().gpa.toFixed(2)}
                </span>
                <span className="text-zinc-500 text-lg">/ 4.00</span>
              </div>
              <p className="text-xs text-zinc-500 mt-3 max-w-[200px]">
                Calculated on {getStudentGPAMetrics().totalCredits} completed & active credits.
              </p>
            </div>
            
            <div className="w-full mt-6 pt-6 border-t border-zinc-900 grid grid-cols-2 gap-4">
              <div className="text-center border-r border-zinc-900">
                <span className="block text-zinc-400 text-xs">Academic Status</span>
                <span className="font-sans font-medium text-emerald-400 text-sm">Good Standing</span>
              </div>
              <div className="text-center">
                <span className="block text-zinc-400 text-xs">Total Credits</span>
                <span className="font-mono text-zinc-200 text-sm font-semibold">{getStudentGPAMetrics().totalCredits}</span>
              </div>
            </div>
          </div>

          {/* Transcript details */}
          <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
            <h3 className="font-grotesk font-semibold text-sm text-zinc-200 mb-4">Fall Semester Grade Summary</h3>

            {enrollments.filter((e) => e.studentId === user.id && e.status === "active").length === 0 ? (
              <div className="text-zinc-500 text-xs py-8 text-center border border-dashed border-zinc-800 rounded-lg">
                No active course enrollments found to grade.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {enrollments
                  .filter((e) => e.studentId === user.id && e.status === "active")
                  .map((enroll) => {
                    const course = courses.find((c) => c.id === enroll.courseId);
                    const metrics = getCourseGradeMetrics(enroll.id);
                    if (!course) return null;

                    return (
                      <div key={enroll.id} className="rounded-lg bg-zinc-900/50 border border-zinc-800/80 p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="font-mono text-xs font-semibold text-indigo-400">{course.code}</span>
                            <h4 className="text-sm font-medium text-zinc-200 mt-0.5">{course.name}</h4>
                          </div>
                          
                          {metrics.totalWeight > 0 ? (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="block font-mono text-xs font-semibold text-zinc-300">
                                  {metrics.average.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-zinc-500">{(metrics.totalWeight * 100).toFixed(0)}% evaluated</span>
                              </div>
                              <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${metrics.color}`}>
                                {metrics.letter}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded italic">No scores graded yet</span>
                          )}
                        </div>

                        {/* Component breakdowns */}
                        {metrics.gradesList.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800">
                            {metrics.gradesList.map((g) => (
                              <div key={g.id} className="bg-zinc-900/40 border border-zinc-800 p-2.5 rounded">
                                <span className="text-[10px] text-zinc-400 font-medium block">{g.component}</span>
                                <div className="flex justify-between items-baseline mt-1">
                                  <span className="font-mono font-semibold text-zinc-200 text-sm">{g.score}%</span>
                                  <span className="text-[9px] text-zinc-500">wt: {(g.weight * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FACULTY PORTAL EDIT SCORE VIEW */}
      {user?.role === "faculty" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="font-grotesk font-semibold text-zinc-200 mb-4 text-sm flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-amber-400" />
                Select Section
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Course Code</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => {
                      setSelectedCourseId(e.target.value);
                      setSelectedEnrollmentId("");
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Course --</option>
                    {facultyCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCourseId && (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Student / Scholar</label>
                    <select
                      value={selectedEnrollmentId}
                      onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Student --</option>
                      {courseEnrollments.map((en) => {
                        const s = allUsers.find((u) => u.id === en.studentId);
                        return (
                          <option key={en.id} value={en.id}>
                            {s ? s.fullName : "Unknown Scholar"}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Form to submit score */}
            {selectedEnrollmentId && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <h3 className="font-grotesk font-semibold text-zinc-200 mb-4 text-sm flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-indigo-400" />
                  Grade Component Evaluator
                </h3>

                <form onSubmit={handlePostGrade} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Grade Component</label>
                    <select
                      value={component}
                      onChange={(e: any) => setComponent(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Assignment">Assignment</option>
                      <option value="Midterm">Midterm</option>
                      <option value="Project">Project</option>
                      <option value="Exam">Final Exam</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Score (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Weight Fraction</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1.0"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saveGradeMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-medium py-2 rounded transition flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save Evaluation Score
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Roster & Grade overview */}
          <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-6">
            {!selectedCourseId ? (
              <div className="text-zinc-500 text-xs py-16 text-center border border-dashed border-zinc-800 rounded-lg flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-zinc-600" />
                Select a class section from the left controls to audit scholars and post evaluations.
              </div>
            ) : (
              <div>
                <h3 className="font-grotesk font-semibold text-sm text-zinc-200 mb-4">
                  Class Roster: {courses.find((c) => c.id === selectedCourseId)?.name}
                </h3>

                {courseEnrollments.length === 0 ? (
                  <div className="text-zinc-500 text-xs py-8 text-center bg-zinc-900 border border-zinc-800 rounded">
                    No students currently enrolled in this section.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {courseEnrollments.map((enroll) => {
                      const student = allUsers.find((u) => u.id === enroll.studentId);
                      const metrics = getCourseGradeMetrics(enroll.id);

                      return (
                        <div key={enroll.id} className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium text-zinc-200">
                                {student ? student.fullName : "Unknown Scholar"}
                              </div>
                              <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                {student ? student.email : ""}
                              </div>
                            </div>

                            {metrics.totalWeight > 0 ? (
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="font-mono text-xs font-semibold text-zinc-200">
                                    {metrics.average.toFixed(1)}%
                                  </span>
                                  <span className="text-[9px] text-zinc-500 block">{(metrics.totalWeight * 100).toFixed(0)}% evaluated</span>
                                </div>
                                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${metrics.color}`}>
                                  {metrics.letter}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded">No grades recorded</span>
                            )}
                          </div>

                          {/* Render component weights + actions */}
                          {metrics.gradesList.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800">
                              {metrics.gradesList.map((g) => (
                                <div key={g.id} className="bg-zinc-900 border border-zinc-800/80 p-2 rounded flex justify-between items-center group">
                                  <div>
                                    <span className="text-[10px] text-zinc-400 font-medium block">{g.component}</span>
                                    <div className="flex gap-1.5 items-baseline">
                                      <span className="font-mono font-semibold text-zinc-200 text-xs">{g.score}%</span>
                                      <span className="text-[8px] text-zinc-500">{(g.weight * 100).toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => handleDeleteGrade(g.id)}
                                    className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition duration-150"
                                    title="Retract grade item"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
