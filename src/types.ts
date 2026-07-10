export interface Complaint {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  category: 'quiz' | 'downloads' | 'timetable' | 'other';
  status: 'pending' | 'resolved' | 'closed';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface TimetableSlot {
  time: string;
  subject: string;
  teacher: string;
  room: string;
}

export interface DayTimetable {
  day: string;
  slots: TimetableSlot[];
}
