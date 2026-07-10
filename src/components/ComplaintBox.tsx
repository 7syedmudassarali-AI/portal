import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  MessageSquare,
  Lock,
  LogOut,
  Send,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
  Edit2,
  X,
  FileText,
  User as UserIcon,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Complaint } from '../types';

export const ComplaintBox: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  // New Complaint Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'quiz' | 'downloads' | 'timetable' | 'other'>('quiz');
  const [description, setDescription] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit State
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'quiz' | 'downloads' | 'timetable' | 'other'>('quiz');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Track expanded cards
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);

  // New States for Modal/Actions
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Admin user detection
  const isAdminUser = user && (user.email === '7syedmudassarali@gmail.com' || user.email === '7syedmudassarali');

  // Handle Firebase auth subscription
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        setAuthError(null);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setAuthError('Error loading authentication state.');
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to complaints in real-time when user is logged in
  useEffect(() => {
    if (!user) {
      setComplaints([]);
      return;
    }

    setComplaintsLoading(true);
    const complaintsCollection = 'complaints';

    try {
      // Query complaints owned by the logged-in user, or all complaints if admin
      const isUserAdmin = user.email === '7syedmudassarali@gmail.com' || user.email === '7syedmudassarali';
      const q = isUserAdmin
        ? query(collection(db, complaintsCollection))
        : query(collection(db, complaintsCollection), where('userId', '==', user.uid));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: Complaint[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              userId: data.userId,
              userEmail: data.userEmail,
              userName: data.userName,
              title: data.title,
              description: data.description,
              category: data.category,
              status: data.status as any,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });

          // Sort client-side to avoid needing a composite index
          list.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });

          setComplaints(list);
          setComplaintsLoading(false);
        },
        (error) => {
          setComplaintsLoading(false);
          // Standardized firestore error tracking
          handleFirestoreError(error, OperationType.LIST, complaintsCollection);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      setComplaintsLoading(false);
      console.error('Subscription error:', err);
    }
  }, [user]);

  // Auth operations
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both your email/username and password.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    try {
      let loginEmail = email.trim();
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@gmail.com`;
      }
      await signInWithEmailAndPassword(auth, loginEmail, password);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Login error:', error);
      if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/invalid-credential'
      ) {
        setAuthError('Invalid username/email or password. Please verify you exist in quiz-portal-uet.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError(error.message || 'Authentication failed. Please verify you exist in quiz-portal-uet.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Submit Complaint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title.trim() || !description.trim()) {
      setFormError('Please fill out all fields.');
      return;
    }

    if (title.length > 150) {
      setFormError('Title must not exceed 150 characters.');
      return;
    }

    if (description.length > 1000) {
      setFormError('Description must not exceed 1000 characters.');
      return;
    }

    setSubmitLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const complaintsCollection = 'complaints';
    try {
      const newComplaintPayload = {
        userId: user.uid,
        userEmail: user.email || 'no-email@uet.edu.pk',
        userName: user.displayName || (user.email ? user.email.split('@')[0] : 'Student'),
        title: title.trim(),
        description: description.trim(),
        category,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, complaintsCollection), newComplaintPayload);

      setTitle('');
      setDescription('');
      setCategory('quiz');
      setFormSuccess('Complaint submitted successfully! It is now pending review.');
    } catch (error: any) {
      console.error('Submit complaint error:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, complaintsCollection);
      } catch (wrappedErr: any) {
        setFormError(wrappedErr.message || 'Error submitting complaint. Check rules.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Complaint
  const handleDelete = async (complaintId: string) => {
    const complaintsCollection = `complaints/${complaintId}`;
    try {
      await deleteDoc(doc(db, 'complaints', complaintId));
      setDeleteConfirmId(null);
      setToast({ message: 'Complaint deleted/withdrawn successfully.', type: 'success' });
    } catch (error) {
      console.error('Delete complaint error:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, complaintsCollection);
      } catch (wrappedErr: any) {
        setToast({ message: 'Permission Denied: Cannot delete this complaint.', type: 'error' });
      }
    }
  };

  // Open Edit Modal / Setup Form
  const startEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setEditTitle(complaint.title);
    setEditCategory(complaint.category);
    setEditDescription(complaint.description);
    setEditError(null);
  };

  // Submit Edit
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComplaint || !user) return;

    if (!editTitle.trim() || !editDescription.trim()) {
      setEditError('Fields cannot be empty.');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    const complaintsCollection = `complaints/${editingComplaint.id}`;

    try {
      const docRef = doc(db, 'complaints', editingComplaint.id);
      await updateDoc(docRef, {
        title: editTitle.trim(),
        category: editCategory,
        description: editDescription.trim(),
        updatedAt: serverTimestamp()
      });

      setEditingComplaint(null);
      setToast({ message: 'Complaint updated successfully.', type: 'success' });
    } catch (error) {
      console.error('Update complaint error:', error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, complaintsCollection);
      } catch (wrappedErr: any) {
        setEditError('Permission Denied: Could not update complaint. Ensure it is pending and you own it.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  // Admin Status Transition (Resolve & Close)
  const handleUpdateStatus = async (complaintId: string, newStatus: 'pending' | 'resolved' | 'closed') => {
    const docRef = doc(db, 'complaints', complaintId);
    try {
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      setToast({ message: `Complaint status marked as ${newStatus} successfully.`, type: 'success' });
    } catch (error) {
      console.error('Update status error:', error);
      setToast({ message: 'Error updating status: Permission Denied or Network Error.', type: 'error' });
    }
  };

  // Human readable date helper
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Just now';
  };

  return (
    <div id="complaint-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-200">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-tight">Secure Student Complaint Desk</h2>
            <p className="text-xs text-slate-400">Direct channel to UET administration</p>
          </div>
        </div>

        {user && (
          <button
            id="btn-sign-out"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/50 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {authLoading ? (
            <motion.div
              key="auth-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center gap-3"
            >
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
              <p className="text-slate-500 text-xs">Verifying UET credentials...</p>
            </motion.div>
          ) : !user ? (
            /* Secure Locked State UI */
            <motion.div
              key="auth-locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-6 px-4 flex flex-col items-center max-w-md mx-auto w-full"
            >
              <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 mb-4 shadow-sm">
                <Lock className="w-8 h-8 text-slate-600" />
              </div>

              <h3 className="font-bold text-slate-800 text-base mb-1 tracking-tight">Authentication Required</h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6 text-center">
                For administrative accountability, the Complaint Box is secured. You must log in using your student or administrative credentials.
              </p>

              {authError && (
                <div className="w-full mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start gap-2 text-left border border-red-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div>
                  <label htmlFor="input-login-email" className="block text-xs font-bold text-slate-600 mb-1 text-left">
                    Email or Username
                  </label>
                  <input
                    id="input-login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. student@uet.edu.pk"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="input-login-password" className="block text-xs font-bold text-slate-600 mb-1 text-left">
                    Password
                  </label>
                  <input
                    id="input-login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 active:scale-98 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Secure Account Sign In</span>
                </button>
              </form>

              <div className="mt-6 text-[10px] text-slate-400 font-medium">
                Enforced by Firebase Project #: <span className="font-mono">900634530305</span>
              </div>
            </motion.div>
          ) : (
            /* Logged In Workspace */
            <motion.div
              key="auth-workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Submission Form (Left) */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <UserIcon className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-indigo-700">{isAdminUser ? 'Authenticated Administrator' : 'Authenticated Student'}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-slate-200"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full ${isAdminUser ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'} flex items-center justify-center font-bold text-sm`}>
                        {isAdminUser ? 'A' : (user.displayName ? user.displayName[0] : 'U')}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate">{isAdminUser ? 'System Administrator' : (user.displayName || 'UET Student')}</p>
                      <p className="text-[10px] text-indigo-600 font-bold font-mono truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-slate-200 bg-slate-50/30 rounded-2xl">
                  <h3 className="font-bold text-slate-800 text-sm mb-4 tracking-tight">File a New Complaint</h3>

                  {formError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-start gap-2 border border-red-200">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-start gap-2 border border-emerald-200">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Subject / Title</label>
                      <input
                        id="input-complaint-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Inability to download past papers"
                        maxLength={150}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        required
                      />
                      <div className="flex justify-between mt-1 px-1">
                        <span className="text-[9px] text-slate-400 font-medium">Clearly state the core problem.</span>
                        <span className="text-[9px] font-bold font-mono text-slate-400">{title.length}/150</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Affected Category</label>
                      <select
                        id="select-complaint-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      >
                        <option value="quiz">Online Quiz Portal</option>
                        <option value="downloads">Downloads Repository</option>
                        <option value="timetable">Class Timetable</option>
                        <option value="other">Other Campus Services</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Detailed Description</label>
                      <textarea
                        id="textarea-complaint-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Please describe your complaint in details. Be descriptive of the issues so engineers or administrators can resolve them quickly."
                        rows={5}
                        maxLength={1000}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                        required
                      />
                      <div className="flex justify-between mt-1 px-1">
                        <span className="text-[9px] text-slate-400 font-medium">Up to 1000 characters.</span>
                        <span className="text-[9px] font-bold font-mono text-slate-400">{description.length}/1000</span>
                      </div>
                    </div>

                    <button
                      id="btn-submit-complaint"
                      type="submit"
                      disabled={submitLoading}
                      className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-100"
                    >
                      {submitLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>File Complaint</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Complaints History (Right) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-tight">
                      {isAdminUser ? 'All Student Complaints' : 'Your Filed Complaints'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAdminUser ? 'Real-time administrative triage panel' : 'Real-time tracker of UET actions'}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono border border-slate-200">
                    Total: {complaints.length}
                  </span>
                </div>

                {complaintsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                    <span className="text-slate-400 text-xs">Loading history...</span>
                  </div>
                ) : complaints.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-slate-700">No Complaints Found</h4>
                    <p className="text-[11px] text-slate-400 px-4">
                      {isAdminUser ? 'There are currently no complaints submitted by students.' : 'You have not submitted any complaints yet. Use the form on the left to submit.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {complaints.map((comp) => {
                      const isExpanded = expandedComplaintId === comp.id;
                      const isPending = comp.status === 'pending';
                      const isResolved = comp.status === 'resolved';
                      const isClosed = comp.status === 'closed';

                      return (
                        <motion.div
                          id={`complaint-item-${comp.id}`}
                          layout
                          key={comp.id}
                          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  comp.category === 'quiz' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                  comp.category === 'downloads' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  comp.category === 'timetable' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  'bg-slate-50 text-slate-600 border border-slate-200'
                                }`}>
                                  {comp.category}
                                </span>
                                <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  isPending ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                                  isResolved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                                  'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {isPending ? <Clock className="w-2.5 h-2.5" /> :
                                   isResolved ? <CheckCircle className="w-2.5 h-2.5" /> :
                                   <X className="w-2.5 h-2.5" />}
                                  {comp.status}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-800 text-sm tracking-tight">{comp.title}</h4>
                              {isAdminUser && (
                                <p className="text-[11px] text-indigo-600 font-semibold">
                                  Student: {comp.userName === 'Anonymous Student' && comp.userEmail ? comp.userEmail.split('@')[0] : comp.userName || 'Student'} ({comp.userEmail})
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 font-semibold">Filed: {formatDate(comp.createdAt)}</p>
                            </div>

                            {/* Actions toolbar */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {deleteConfirmId === comp.id ? (
                                <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-100 animate-fadeIn">
                                  <span className="text-[10px] font-bold text-red-700 px-1">Delete?</span>
                                  <button
                                    id={`btn-confirm-delete-${comp.id}`}
                                    onClick={() => handleDelete(comp.id)}
                                    className="text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md transition-colors cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    id={`btn-cancel-delete-${comp.id}`}
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {isAdminUser ? (
                                    <>
                                      {isPending && (
                                        <button
                                          id={`btn-admin-resolve-${comp.id}`}
                                          onClick={() => handleUpdateStatus(comp.id, 'resolved')}
                                          className="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                          title="Resolve Complaint"
                                        >
                                          <CheckCircle className="w-3 h-3" />
                                          Resolve
                                        </button>
                                      )}
                                      {isResolved && (
                                        <button
                                          id={`btn-admin-close-${comp.id}`}
                                          onClick={() => handleUpdateStatus(comp.id, 'closed')}
                                          className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                          title="Close Complaint"
                                        >
                                          <X className="w-3 h-3" />
                                          Close
                                        </button>
                                      )}
                                      <button
                                        id={`btn-admin-delete-${comp.id}`}
                                        onClick={() => setDeleteConfirmId(comp.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete Complaint"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {isPending && (
                                        <>
                                          <button
                                            id={`btn-edit-complaint-${comp.id}`}
                                            onClick={() => startEdit(comp)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                            title="Edit Complaint"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            id={`btn-delete-complaint-${comp.id}`}
                                            onClick={() => setDeleteConfirmId(comp.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                            title="Withdraw Complaint"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Description with Expand/Collapse */}
                          <div className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                            <p className={isExpanded ? '' : 'line-clamp-2'}>
                              {comp.description}
                            </p>
                            {comp.description.length > 120 && (
                              <button
                                id={`btn-toggle-expand-${comp.id}`}
                                onClick={() => setExpandedComplaintId(isExpanded ? null : comp.id)}
                                className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold mt-1 flex items-center gap-0.5"
                              >
                                {isExpanded ? 'Collapse' : 'Show full details'}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Complaint Modal */}
      <AnimatePresence>
        {editingComplaint && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden"
            >
              <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm tracking-tight">Update Pending Complaint</h3>
                <button
                  id="btn-close-edit"
                  onClick={() => setEditingComplaint(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="p-5 space-y-4">
                {editError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-[11px] text-red-600 font-bold animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{editError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Subject / Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={150}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block text-right font-bold">{editTitle.length}/150</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="quiz">Online Quiz Portal</option>
                    <option value="downloads">Downloads Repository</option>
                    <option value="timetable">Class Timetable</option>
                    <option value="other">Other Campus Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Detailed Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    required
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block text-right font-bold">{editDescription.length}/1000</span>
                </div>

                <div className="flex gap-2 justify-end border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingComplaint(null)}
                    className="px-3.5 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-edited-complaint"
                    type="submit"
                    disabled={editLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-100"
                  >
                    {editLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 max-w-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                : 'bg-red-50 text-red-800 border-red-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            )}
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-auto text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
