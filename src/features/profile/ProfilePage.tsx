import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Pencil,
  X,
  Check,
  MessageSquare,
  ChevronRight,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { updateUserProfile, signOut } from '@/services/firebase/auth'
import { submitFeedbackCallable } from '@/services/firebase/functions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { UserType } from '@/types'

const FEEDBACK_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const FEEDBACK_STORAGE_KEY = 'tl_feedback_lastSentAt'
const MAX_WORDS = 200

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getRoleLabel(role: string): string {
  return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-bold uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-white/60">
        {label} {required && <span className="text-pink">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-pink font-bold">{error}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, refetchProfile, isAdmin } = useAuth()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [form, setForm] = useState({
    displayName: '',
    contact: '',
    department: '',
    universityId: '',
    courseName: '',
    facultyAdvisor: '',
    researchArea: '',
    associatedCourse: '',
    studentsInvolved: '',
    startupName: '',
    industryDomain: '',
    startupBrief: '',
    labTeamMembers: '',
    organization: '',
    designation: '',
    purposeOfVisit: '',
    referral: '',
  })

  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName || '',
        contact: profile.contact || '',
        department: profile.department || '',
        universityId: profile.universityId || '',
        courseName: profile.courseName || '',
        facultyAdvisor: profile.facultyAdvisor || '',
        researchArea: profile.researchArea || '',
        associatedCourse: profile.associatedCourse || '',
        studentsInvolved: profile.studentsInvolved || '',
        startupName: profile.startupName || '',
        industryDomain: profile.industryDomain || '',
        startupBrief: profile.startupBrief || '',
        labTeamMembers: profile.labTeamMembers || '',
        organization: profile.organization || '',
        designation: profile.designation || '',
        purposeOfVisit: profile.purposeOfVisit || '',
        referral: profile.referral || '',
      })
    }
  }, [profile])

  const feedbackStorageKey = `${FEEDBACK_STORAGE_KEY}_${user?.uid || ''}`

  const computeRemaining = () => {
    const stored = localStorage.getItem(feedbackStorageKey)
    if (!stored) return 0
    const elapsed = Date.now() - Number(stored)
    const remaining = Math.ceil((FEEDBACK_WINDOW_MS - elapsed) / 1000)
    return remaining > 0 ? remaining : 0
  }

  useEffect(() => {
    setCooldownRemaining(computeRemaining())
    cooldownRef.current = setInterval(() => {
      const r = computeRemaining()
      setCooldownRemaining(r)
      if (r === 0 && cooldownRef.current) clearInterval(cooldownRef.current)
    }, 1000)
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackStorageKey])

  const wordCount = countWords(feedbackText)
  const wordLimitExceeded = wordCount > MAX_WORDS
  const feedbackBlocked = cooldownRemaining > 0 || wordLimitExceeded || feedbackText.trim().length === 0

  const formatCooldown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const handleSave = async () => {
    if (!user) return
    if (!profile) { navigate('/onboarding'); return }

    setEditError(null)
    if (!form.displayName.trim()) { setEditError('Full name is required.'); return }
    if (!form.contact.trim()) { setEditError('Contact number is required.'); return }
    if (profile.userType === 'Student' && (!form.universityId.trim() || !form.department.trim())) {
      setEditError('University ID and Department are required.'); return
    }
    if (profile.userType === 'Professor or Faculty' && (!form.department.trim() || !form.researchArea.trim())) {
      setEditError('Department and Research Area are required.'); return
    }
    if (profile.userType === 'Venture Studio Startup' && (!form.startupName.trim() || !form.industryDomain.trim() || !form.startupBrief.trim())) {
      setEditError('Startup Name, Industry, and Brief are required.'); return
    }
    if (profile.userType === 'External Visitor' && (!form.organization.trim() || !form.designation.trim() || !form.purposeOfVisit.trim())) {
      setEditError('Organization, Designation, and Purpose are required.'); return
    }

    const ut = profile.userType as string
    const shared = { displayName: form.displayName, contact: form.contact }
    const typeFields: Record<string, string[]> = {
      'Student': ['universityId', 'department', 'courseName', 'facultyAdvisor'],
      'Professor or Faculty': ['department', 'researchArea', 'associatedCourse', 'studentsInvolved'],
      'Venture Studio Startup': ['startupName', 'industryDomain', 'startupBrief', 'labTeamMembers'],
      'External Visitor': ['organization', 'designation', 'purposeOfVisit', 'referral'],
    }
    const applicable = typeFields[ut] ?? []
    const filtered: Record<string, string> = { ...shared }
    for (const key of applicable) {
      filtered[key] = (form as any)[key] ?? ''
    }
    setSaving(true)
    try {
      await updateUserProfile(user.uid, filtered)
      await refetchProfile()
      setEditing(false)
      toast.success('Profile updated!')
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!user || !profile || feedbackBlocked) return
    setFeedbackSubmitting(true)

    try {
      // Server-enforced submission (Cloud Function) — 5-min rate limit is
      // stamped server-side on feedbackWindows/{uid}, not client-predictable.
      await submitFeedbackCallable({ message: feedbackText.trim() })
      localStorage.setItem(feedbackStorageKey, String(Date.now()))
      setCooldownRemaining(FEEDBACK_WINDOW_MS / 1000)
      setFeedbackText('')
      setFeedbackOpen(false)
      toast.success('Feedback sent! Thank you.')
      if (cooldownRef.current) clearInterval(cooldownRef.current)
      cooldownRef.current = setInterval(() => {
        const r = computeRemaining()
        setCooldownRemaining(r)
        if (r <= 0 && cooldownRef.current) clearInterval(cooldownRef.current)
      }, 1000)
    } catch {
      toast.error('Failed to send feedback. Please try again.')
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  const photoURL = user?.photoURL
  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Lab Member'
  const initials = displayName.slice(0, 2).toUpperCase()
  const userType = profile?.userType as UserType | undefined

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-4 animate-in fade-in duration-300 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white">Profile</h1>
        {!editing && profile && (
          <button
            id="profile-edit-btn"
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 rounded-full border border-hairline bg-charcoal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            <Pencil size={14} />
            Edit Profile
          </button>
        )}
      </div>

      {/* Avatar + Identity */}
      <div className="flex items-center gap-5 rounded-card border border-hairline bg-charcoal p-6">
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover ring-2 ring-pink shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-pink text-2xl font-extrabold text-black ring-2 ring-pink">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xl font-extrabold text-white truncate">{displayName}</p>
          <p className="text-sm text-white/50 truncate">{user?.email}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {profile?.role && getRoleLabel(profile.role).toLowerCase() !== userType?.toLowerCase() && (
              <span className="rounded-full bg-indigo/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                {getRoleLabel(profile.role)}
              </span>
            )}
            {userType && (
              <span className="rounded-full bg-pink/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-pink">
                {userType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* No-profile onboarding CTA */}
      {!editing && user && !profile && (
        <div className="rounded-card border border-hairline bg-charcoal p-6 text-center space-y-4">
          <p className="text-sm font-bold text-white">Complete your profile to get started.</p>
          <p className="text-xs text-white/50">Set up your profile to book machines, manage checkouts, and access the lab.</p>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="tl-pill-button inline-flex items-center gap-2"
          >
            <ChevronRight size={16} />
            Go to Onboarding
          </button>
        </div>
      )}

      {/* View Mode */}
      {!editing && profile && (
        <div className="rounded-card border border-hairline bg-charcoal p-6 space-y-5">
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <InfoRow label="Contact" value={profile?.contact} />
            <InfoRow label="Department" value={profile?.department} />
            <InfoRow label="University ID" value={profile?.universityId} />
            <InfoRow label="Course" value={profile?.courseName} />
            <InfoRow label="Faculty Advisor" value={profile?.facultyAdvisor} />
            <InfoRow label="Research Area" value={profile?.researchArea} />
            <InfoRow label="Associated Course" value={profile?.associatedCourse} />
            {profile?.studentsInvolved && (
              <div className="sm:col-span-2">
                <InfoRow label="Students Involved" value={profile.studentsInvolved} />
              </div>
            )}
            <InfoRow label="Startup Name" value={profile?.startupName} />
            <InfoRow label="Industry / Domain" value={profile?.industryDomain} />
            {profile?.startupBrief && (
              <div className="sm:col-span-2">
                <InfoRow label="Startup Brief" value={profile.startupBrief} />
              </div>
            )}
            {profile?.labTeamMembers && (
              <div className="sm:col-span-2">
                <InfoRow label="Lab Team Members" value={profile.labTeamMembers} />
              </div>
            )}
            <InfoRow label="Organization" value={profile?.organization} />
            <InfoRow label="Designation" value={profile?.designation} />
            {profile?.purposeOfVisit && (
              <div className="sm:col-span-2">
                <InfoRow label="Purpose of Visit" value={profile.purposeOfVisit} />
              </div>
            )}
            <InfoRow label="Referral" value={profile?.referral} />
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {editing && (
        <div className="rounded-card border border-hairline bg-charcoal p-6 space-y-5 animate-in fade-in duration-200">
          <p className="text-xs font-black uppercase tracking-widest text-white/40">Edit Details</p>

          {editError && (
            <div className="flex items-start gap-2 rounded-md border border-pink/40 bg-pink/10 p-3 text-sm font-bold text-white">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-pink" />
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Full Name" required htmlFor="profile-name">
              <input
                id="profile-name"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Your full name"
                className="tl-input"
              />
            </Field>
            <Field label="Contact Number" required htmlFor="profile-contact">
              <input
                id="profile-contact"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                placeholder="+91 XXXXXXXXXX"
                className="tl-input"
              />
            </Field>

            {userType === 'Student' && (
              <>
                <Field label="University ID" required htmlFor="profile-uni-id">
                  <input id="profile-uni-id" value={form.universityId}
                    onChange={(e) => setForm((f) => ({ ...f, universityId: e.target.value }))}
                    placeholder="e.g. AU2440123" className="tl-input" />
                </Field>
                <Field label="Department" required htmlFor="profile-dept">
                  <input id="profile-dept" value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. CSE" className="tl-input" />
                </Field>
                <Field label="Course / Curriculum" htmlFor="profile-course">
                  <input id="profile-course" value={form.courseName}
                    onChange={(e) => setForm((f) => ({ ...f, courseName: e.target.value }))}
                    placeholder="e.g. B.Tech CSE" className="tl-input" />
                </Field>
                <Field label="Faculty Advisor" htmlFor="profile-advisor">
                  <input id="profile-advisor" value={form.facultyAdvisor}
                    onChange={(e) => setForm((f) => ({ ...f, facultyAdvisor: e.target.value }))}
                    placeholder="Faculty advisor name" className="tl-input" />
                </Field>
              </>
            )}

            {userType === 'Professor or Faculty' && (
              <>
                <Field label="Department" required htmlFor="profile-dept-f">
                  <input id="profile-dept-f" value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="e.g. Mechanical" className="tl-input" />
                </Field>
                <Field label="Research Area" required htmlFor="profile-research">
                  <input id="profile-research" value={form.researchArea}
                    onChange={(e) => setForm((f) => ({ ...f, researchArea: e.target.value }))}
                    placeholder="Your research area" className="tl-input" />
                </Field>
                <Field label="Associated Course" htmlFor="profile-assoc">
                  <input id="profile-assoc" value={form.associatedCourse}
                    onChange={(e) => setForm((f) => ({ ...f, associatedCourse: e.target.value }))}
                    placeholder="e.g. ME301" className="tl-input" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Students Involved" htmlFor="profile-students">
                    <textarea id="profile-students" value={form.studentsInvolved}
                      onChange={(e) => setForm((f) => ({ ...f, studentsInvolved: e.target.value }))}
                      placeholder="Names/IDs of students (optional)"
                      className="tl-input min-h-[80px] resize-none" />
                  </Field>
                </div>
              </>
            )}

            {userType === 'Venture Studio Startup' && (
              <>
                <Field label="Startup Name" required htmlFor="profile-startup-name">
                  <input id="profile-startup-name" value={form.startupName}
                    onChange={(e) => setForm((f) => ({ ...f, startupName: e.target.value }))}
                    placeholder="Startup's name" className="tl-input" />
                </Field>
                <Field label="Industry / Domain" required htmlFor="profile-industry">
                  <input id="profile-industry" value={form.industryDomain}
                    onChange={(e) => setForm((f) => ({ ...f, industryDomain: e.target.value }))}
                    placeholder="e.g. CleanTech" className="tl-input" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Brief About Your Startup" required htmlFor="profile-brief">
                    <textarea id="profile-brief" value={form.startupBrief}
                      onChange={(e) => setForm((f) => ({ ...f, startupBrief: e.target.value }))}
                      placeholder="Describe your startup…"
                      className="tl-input min-h-[80px] resize-none" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                    <Field label="Team Members Using the Lab" htmlFor="profile-lab-team">
                    <textarea id="profile-lab-team" value={form.labTeamMembers}
                      onChange={(e) => setForm((f) => ({ ...f, labTeamMembers: e.target.value }))}
                      placeholder="Names of team members (optional)"
                      className="tl-input min-h-[80px] resize-none" />
                  </Field>
                </div>
              </>
            )}

            {userType === 'External Visitor' && (
              <>
                <Field label="Organization / Institution" required htmlFor="profile-org">
                  <input id="profile-org" value={form.organization}
                    onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                    placeholder="Your organization" className="tl-input" />
                </Field>
                <Field label="Designation / Role" required htmlFor="profile-designation">
                  <input id="profile-designation" value={form.designation}
                    onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                    placeholder="e.g. Researcher" className="tl-input" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Purpose of Visit" required htmlFor="profile-purpose">
                    <textarea id="profile-purpose" value={form.purposeOfVisit}
                      onChange={(e) => setForm((f) => ({ ...f, purposeOfVisit: e.target.value }))}
                      placeholder="Describe why you are visiting the lab…"
                      className="tl-input min-h-[80px] resize-none" />
                  </Field>
                </div>
                <Field label="Referral" htmlFor="profile-referral">
                  <input id="profile-referral" value={form.referral}
                    onChange={(e) => setForm((f) => ({ ...f, referral: e.target.value }))}
                    placeholder="Who referred you? (optional)" className="tl-input" />
                </Field>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-hairline">
            <button
              id="profile-cancel-btn"
              type="button"
              onClick={() => { setEditing(false); setEditError(null) }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-hairline bg-near-black py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <X size={16} /> Cancel
            </button>
            <button
              id="profile-save-btn"
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink py-2.5 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="rounded-card border border-hairline bg-charcoal overflow-hidden">
        <button
          id="profile-feedback-toggle"
          type="button"
          onClick={() => setFeedbackOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={18} className="text-white/50" />
            <div>
              <p className="text-sm font-bold text-white">Send Feedback</p>
              <p className="text-xs text-white/40">Share suggestions or report a problem</p>
            </div>
          </div>
          <ChevronRight
            size={16}
            className={cn('text-white/30 transition-transform duration-200', feedbackOpen && 'rotate-90')}
          />
        </button>

        {feedbackOpen && (
          <div className="border-t border-hairline px-6 pb-6 pt-5 space-y-4 animate-in fade-in duration-200">
            <div className="relative">
              <label htmlFor="profile-feedback-input" className="sr-only">Feedback message</label>
              <textarea
                id="profile-feedback-input"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What's on your mind? Max 200 words…"
                rows={5}
                className={cn('tl-input w-full resize-none', wordLimitExceeded && 'ring-2 ring-pink')}
              />
              <p
                className={cn(
                  'absolute bottom-2 right-3 text-xs font-bold tabular-nums select-none',
                  wordLimitExceeded ? 'text-pink' : 'text-white/30',
                )}
              >
                {wordCount} / {MAX_WORDS}
              </p>
            </div>

            {wordLimitExceeded && (
              <p className="text-xs text-pink font-bold">
                Over the 200-word limit. Please shorten your message.
              </p>
            )}

            {cooldownRemaining > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-near-black px-4 py-2.5 text-xs font-bold text-white/50">
                <Loader2 size={13} className="animate-spin" />
                Next feedback available in {formatCooldown(cooldownRemaining)}
              </div>
            )}

            <button
              id="profile-feedback-submit"
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={feedbackBlocked || feedbackSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-indigo py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              {feedbackSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <MessageSquare size={15} />
              )}
              {feedbackSubmitting ? 'Sending…' : 'Send Feedback'}
            </button>
          </div>
        )}
      </div>

      {/* Admin Panel */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="flex w-full items-center justify-between rounded-card border border-hairline bg-charcoal px-6 py-4 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="text-indigo" />
            <div>
              <p className="text-sm font-bold text-white">Admin Panel</p>
              <p className="text-xs text-white/40">Manage users, bookings, and inventory</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-white/30" />
        </button>
      )}

      {/* Log Out */}
      <button
        id="profile-logout-btn"
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-pink/30 bg-pink/10 py-3 text-sm font-bold text-pink transition-all hover:bg-pink/20 hover:border-pink/60"
      >
        <LogOut size={16} />
        Log Out
      </button>

      <p className="text-center text-xs text-white/20 pb-4">
        © {new Date().getFullYear()} Tinkerers&apos; Lab · Ahmedabad University
      </p>
    </div>
  )
}

