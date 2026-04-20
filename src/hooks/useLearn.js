import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('courses')
      .select('*')
      .order('is_pro', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setCourses(data ?? [])
        setLoading(false)
      })
  }, [])

  return { courses, loading }
}

export function useChapters(courseId) {
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!courseId) return
    supabase
      .from('chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setChapters(data ?? [])
        setLoading(false)
      })
  }, [courseId])

  return { chapters, loading }
}

export function useProgress() {
  const { user } = useUserStore()
  const [completedIds, setCompletedIds] = useState(new Set())
  const [certificates, setCertificates] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_progress')
      .select('chapter_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setCompletedIds(new Set(data.map(r => r.chapter_id)))
      })
    supabase
      .from('user_certificates')
      .select('course_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setCertificates(data.map(r => r.course_id))
      })
  }, [user?.id])

  async function markChapterComplete(chapterId, courseId, quizScore) {
    if (!user) return
    const { error } = await supabase.from('user_progress').upsert({
      user_id: user.id,
      chapter_id: chapterId,
      course_id: courseId,
      quiz_score: quizScore ?? null,
    })
    if (!error) setCompletedIds(prev => new Set([...prev, chapterId]))
  }

  async function issueCertificate(courseId) {
    if (!user || certificates.includes(courseId)) return
    const { error } = await supabase.from('user_certificates').upsert({
      user_id: user.id,
      course_id: courseId,
    })
    if (!error) setCertificates(prev => [...prev, courseId])
  }

  return { completedIds, certificates, markChapterComplete, issueCertificate }
}
