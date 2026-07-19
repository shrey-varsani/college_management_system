import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { Course, Enrollment } from "../types";
import { useSelector } from "react-redux";
import { RootState } from "../lib/store";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function CalendarView() {
  const { user } = useSelector((state: RootState) => state.app);

  // Fetch courses
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
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

  // Filter courses based on user role
  const getMyCourses = (): Course[] => {
    if (!user) return [];
    if (user.role === "student") {
      const myCourseIds = enrollments
        .filter((e) => e.studentId === user.id && e.status === "active")
        .map((e) => e.courseId);
      return courses.filter((c) => myCourseIds.includes(c.id));
    }
    if (user.role === "faculty") {
      return courses.filter((c) => c.facultyId === user.id);
    }
    return courses; // Principals and Librarians see all course schedules
  };

  const myCourses = getMyCourses();

  // Parse timeSlot "Monday 09:00 - 10:30" to specific recurring dates for display
  // Let's generate dates for the current week starting Mon, July 20, 2026 through Friday
  const generateEvents = () => {
    const events: any[] = [];
    const dayMap: Record<string, number> = {
      Monday: 20,
      Tuesday: 21,
      Wednesday: 22,
      Thursday: 23,
      Friday: 24,
    };

    const colors = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

    myCourses.forEach((course, idx) => {
      if (!course.timeSlot) return;

      // Extract e.g. "Monday" and "09:00 - 10:30"
      const parts = course.timeSlot.split(" ");
      const dayName = parts[0]; // e.g. "Monday"
      const times = course.timeSlot.replace(`${dayName} `, "").split(" - ");
      
      if (times.length !== 2) return;
      const startTime = times[0]; // "09:00"
      const endTime = times[1];   // "10:30"

      const dayOfMonth = dayMap[dayName];
      if (!dayOfMonth) return;

      // We repeat it for 2 consecutive weeks to look fully populated
      for (let week = 0; week < 3; week++) {
        const dateOffset = dayOfMonth + (week * 7);
        const dateStr = `2026-07-${dateOffset < 10 ? "0" + dateOffset : dateOffset}`;
        
        events.push({
          id: `${course.id}_w${week}`,
          title: `${course.code}: ${course.name}`,
          start: `${dateStr}T${startTime}:00`,
          end: `${dateStr}T${endTime}:00`,
          backgroundColor: colors[idx % colors.length],
          borderColor: "transparent",
          extendedProps: {
            room: course.room || "TBD",
            credits: course.credits,
            dept: course.department,
          },
        });
      }
    });

    return events;
  };

  const events = generateEvents();

  const handleEventClick = (info: any) => {
    const { room, credits, dept } = info.event.extendedProps;
    toast(`📚 Course Detail: ${info.event.title}\n📍 Location: ${room}\n🎓 Credits: ${credits} pts\n🏢 Dept: ${dept}`, {
      icon: "🏫",
      duration: 4000,
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-grotesk text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <Calendar className="h-6 w-6 text-indigo-500" />
            Class Timetable & Calendar
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            {user?.role === "student"
              ? "View class schedules for your active courses."
              : user?.role === "faculty"
              ? "View and manage timetables for courses you are instructing."
              : "Complete institutional scheduling planner."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Course schedule list sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-5 shadow-sm dark:shadow-xl">
            <h3 className="font-grotesk font-semibold text-slate-800 dark:text-zinc-200 mb-3 flex items-center gap-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Schedule Summary
            </h3>
            
            {myCourses.length === 0 ? (
              <div className="text-slate-500 dark:text-zinc-500 text-xs py-2">
                No active class timetables assigned. Join courses or run automated scheduling to fill dates.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myCourses.map((c) => (
                  <div key={c.id} className="rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{c.code}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">{c.credits} cr</span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">{c.name}</div>
                    
                    {c.timeSlot ? (
                      <div className="flex flex-col gap-1 text-[10px] text-slate-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                          <span>{c.timeSlot}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                          <span>{c.room || "No room assigned"}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-rose-500">Unscheduled</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* The interactive Calendar itself */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 shadow-sm dark:shadow-xl">
          <div className="text-slate-800 dark:text-zinc-100">
            {isLoadingCourses ? (
              <div className="h-96 flex items-center justify-center text-slate-500 dark:text-zinc-400 font-sans">
                Loading academic schedule matrix...
              </div>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate="2026-07-20"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                events={events}
                eventClick={handleEventClick}
                height="auto"
                aspectRatio={1.5}
                themeSystem="standard"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
