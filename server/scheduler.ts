import { Course, User, CollegeDatabase } from "./db";

// Constraints for Scheduling
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = [
  "09:00 - 10:30",
  "10:45 - 12:15",
  "13:30 - 15:00",
  "15:15 - 16:45"
];
const ROOMS = ["Room 101", "Room 202", "Room 303", "Lab A", "Lab B"];

interface ScheduleResult {
  success: boolean;
  courses: Course[];
  logs: string[];
}

export function runAutomatedScheduler(): ScheduleResult {
  const logs: string[] = ["Starting automated schedule generation solver..."];
  
  // Load current database state
  const currentCourses = [...CollegeDatabase.getCourses()];
  const allUsers = CollegeDatabase.getUsers();
  
  // Faculty indexed by department
  const facultyByDept: Record<string, User[]> = {};
  allUsers.forEach(user => {
    if (user.role === "faculty") {
      if (!facultyByDept[user.department]) {
        facultyByDept[user.department] = [];
      }
      facultyByDept[user.department].push(user);
    }
  });

  logs.push(`Loaded faculty departments: ${Object.keys(facultyByDept).join(", ")}`);

  // Clear existing schedules for courses that we want to reschedule,
  // or keep static schedules as pre-defined anchors. Let's reschedule all courses to ensure a clean global layout,
  // or keep the predefined ones and schedule only unscheduled ones. Let's reschedule everything that has null,
  // or do a complete rebuild. A complete rebuild of all course times is usually best to avoid unsolvable states,
  // but let's allow retaining fixed ones if they work, or just solve for all of them together!
  // To show off the algorithm, let's solve schedules for ALL courses in the database dynamically!
  const coursesToSchedule = currentCourses;
  
  // We need to find assignments (facultyId, day, slot, room) for each course
  // Let's model a slot as day + timeSlot + room
  // And check for overlap conflicts:
  // - Faculty conflict: same faculty at same day + timeSlot
  // - Room conflict: same room at same day + timeSlot
  
  const assignedSchedules: Course[] = [];
  
  // Helper to check if a choice is valid
  function isChoiceValid(
    course: Course,
    facultyId: string,
    day: string,
    slot: string,
    room: string
  ): boolean {
    const timeCombo = `${day} ${slot}`;
    
    // Check against all currently assigned schedules in this run
    for (const assigned of assignedSchedules) {
      if (assigned.timeSlot === timeCombo) {
        // Room conflict
        if (assigned.room === room) {
          return false;
        }
        // Faculty conflict
        if (assigned.facultyId === facultyId) {
          return false;
        }
      }
    }
    return true;
  }

  // Backtracking solver
  function solve(index: number): boolean {
    if (index >= coursesToSchedule.length) {
      return true; // All courses scheduled successfully!
    }

    const course = coursesToSchedule[index];
    const qualifiedFaculty = facultyByDept[course.department] || [];
    
    if (qualifiedFaculty.length === 0) {
      logs.push(`⚠️ WARNING: No qualified faculty found for ${course.name} (${course.department}).`);
      return false; 
    }

    // Try each faculty member
    for (const faculty of qualifiedFaculty) {
      // Try each day
      for (const day of DAYS) {
        // Try each time slot
        for (const slot of TIME_SLOTS) {
          // Try each room
          for (const room of ROOMS) {
            
            if (isChoiceValid(course, faculty.id, day, slot, room)) {
              // Tentative assignment
              const originalFaculty = course.facultyId;
              const originalTime = course.timeSlot;
              const originalRoom = course.room;

              course.facultyId = faculty.id;
              course.timeSlot = `${day} ${slot}`;
              course.room = room;
              assignedSchedules.push(course);

              // Recurse to schedule the next course
              if (solve(index + 1)) {
                return true;
              }

              // Backtrack if it fails down the line
              assignedSchedules.pop();
              course.facultyId = originalFaculty;
              course.timeSlot = originalTime;
              course.room = originalRoom;
            }
          }
        }
      }
    }

    return false; // Could not find a valid combination
  }

  logs.push(`Attempting to schedule ${coursesToSchedule.length} total courses...`);
  const success = solve(0);

  if (success) {
    logs.push("✅ Success! Solved all scheduling constraints cleanly.");
    // Log the assignments
    coursesToSchedule.forEach(c => {
      const professor = allUsers.find(u => u.id === c.facultyId)?.fullName || "Unknown";
      logs.push(` - ${c.code}: Assigned to ${professor} | ${c.timeSlot} in ${c.room}`);
    });
    
    // Save scheduled courses back to the DB
    CollegeDatabase.saveCourses(coursesToSchedule);
  } else {
    logs.push("❌ Failed to find a conflict-free schedule. Constraint thresholds may be too tight.");
  }

  return {
    success,
    courses: success ? coursesToSchedule : currentCourses,
    logs
  };
}
