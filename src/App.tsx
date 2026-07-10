import { PortalCard } from './components/PortalCard';
import { ComplaintBox } from './components/ComplaintBox';
import { ClipboardList, DownloadCloud, Calendar, ShieldCheck, Landmark } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const portalCards = [
    {
      id: 'quiz',
      title: 'Quiz Portal',
      description: 'The primary gateway to access examinations, departmental quizzes, midterms, and auto-graded mock assessments. Check active quizzes and real-time grading reports.',
      defaultUrl: 'https://quiz.uetai.workers.dev/',
      localStorageKey: 'uet_quiz_portal_url',
      icon: <ClipboardList className="w-5 h-5 text-indigo-600" />,
      accentColor: 'bg-indigo-600',
      features: [
        'Midterm Practice Exams',
        'Auto-evaluated Assessments',
        'Detailed Score Diagnostics',
        'Engineering Core Quizzes'
      ]
    },
    {
      id: 'downloads',
      title: 'Downloads',
      description: 'Access the centralized student repository for curriculum files, past papers, lecture slides, department-licensed software, and download the official Quiz Portal app.',
      defaultUrl: 'https://download.uetai.workers.dev/',
      localStorageKey: 'uet_downloads_portal_url',
      icon: <DownloadCloud className="w-5 h-5 text-blue-600" />,
      accentColor: 'bg-blue-600',
      features: [
        'Quiz Portal Offline App',
        'Syllabus & Past Papers',
        'Faculty Lecture Slides',
        'Engineering Software Tools'
      ]
    },
    {
      id: 'timetable',
      title: 'Timetable',
      description: 'Stay updated with active class timings, lab practical slots, exam invigilation schedules, and department seminars. Check the full university timetable database.',
      defaultUrl: 'https://timetable.syedmudassarali.workers.dev/',
      localStorageKey: 'uet_timetable_portal_url',
      icon: <Calendar className="w-5 h-5 text-emerald-600" />,
      accentColor: 'bg-emerald-600',
      features: [
        'Weekly Lecture Schedules',
        'Lab Practical Rotations',
        'Faculty Office Hours',
        'Department Seminar Slots'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-slate-100/80 border border-slate-200/50 px-3 py-1.5 rounded-full text-slate-600 text-xs font-semibold">
            <Landmark className="w-3.5 h-3.5" />
            <span>Official Student Resource Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
            UET Electrical Engineering Department
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            A unified entry point for UET students to access online quizzes, curriculum downloads, class timetables, and securely register grievances.
          </p>
        </motion.div>

        {/* Section 1: Three Gateway Blocks */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Gateway Portals</h2>
              <p className="text-xs text-slate-400">Direct links to your academic systems</p>
            </div>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Fully Configurable URLs
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {portalCards.map((card) => (
              <PortalCard
                key={card.id}
                id={card.id}
                title={card.title}
                description={card.description}
                defaultUrl={card.defaultUrl}
                localStorageKey={card.localStorageKey}
                icon={card.icon}
                accentColor={card.accentColor}
                features={card.features}
              />
            ))}
          </div>
        </div>

        {/* Section 3: Secured Complaint Box */}
        <div className="space-y-6 pt-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Administrative Care & Complaints</h2>
            <p className="text-xs text-slate-400">Authenticated and logged channels for student grievances</p>
          </div>

          <ComplaintBox />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 University of Engineering & Technology. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
