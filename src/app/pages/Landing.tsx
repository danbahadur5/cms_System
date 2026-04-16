import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import {
  ArrowRight,
  BookOpen,
  FolderOpen,
  Clock,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  PenLine,
} from "lucide-react";
import { fetchPublicStats } from "../utils/courseService";

export default function Landing() {
  const [courseCount, setCourseCount] = useState(0);
  const [lessonCount, setLessonCount] = useState(0);
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    fetchPublicStats()
      .then((s) => {
        setCourseCount(s.courses);
        setLessonCount(s.lessons);
      })
      .catch(() => {
        setCourseCount(0);
        setLessonCount(0);
      })
      .finally(() => setStatsReady(true));
  }, []);

  const steps = [
    {
      title: "Choose a course",
      text: "Open the catalog and pick the program that fits what you want to learn.",
    },
    {
      title: "Open a topic",
      text: "Each course is split into topics—like chapters—so you always know where you are.",
    },
    {
      title: "Follow the days",
      text: "Lessons are grouped by day with clear teaching, practice, and project steps.",
    },
  ] as const;

  const highlights = [
    {
      icon: LayoutGrid,
      title: "Simple layout",
      text: "Courses, topics, and lessons nest cleanly—no noisy sidebars or ads.",
    },
    {
      icon: PenLine,
      title: "Practice built in",
      text: "See when to read, when to try, and when to build something real.",
    },
    {
      icon: Clock,
      title: "Your pace",
      text: "Come back anytime; progress is easy to find from the course list.",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[#fafbfc] text-gray-900">
      {/* Hero */}
      <section className="relative border-b border-gray-200/80 bg-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#ffffff_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                <GraduationCap
                  className="h-3.5 w-3.5 text-slate-500"
                  aria-hidden
                />
                Course Hub
              </p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
                Learn in order, without the clutter.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-gray-600 sm:text-lg">
                Browse courses like folders, open topics, and work through
                day-by-day lessons—all in one calm, focused place.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link to="/courses" className="inline-flex">
                  <Button
                    size="lg"
                    className="h-11 w-full gap-2 rounded-lg px-6 text-[15px] font-medium sm:w-auto"
                  >
                    Browse courses
                    <ArrowRight className="h-4 w-4 opacity-90" aria-hidden />
                  </Button>
                </Link>
                <a href="#steps" className="inline-flex">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-11 w-full rounded-lg text-[15px] font-medium text-gray-700 hover:bg-slate-100 sm:w-auto"
                  >
                    See how it works
                  </Button>
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-gray-100 pt-8 text-sm text-gray-500">
                {!statsReady ? (
                  <span className="text-gray-400">Loading library stats…</span>
                ) : courseCount > 0 ? (
                  <>
                    <span>
                      <span className="font-semibold text-gray-800">
                        {courseCount}
                      </span>{" "}
                      courses
                    </span>
                    <span
                      className="hidden h-4 w-px bg-gray-200 sm:inline-block"
                      aria-hidden
                    />
                    <span>
                      <span className="font-semibold text-gray-800">
                        {lessonCount}
                      </span>{" "}
                      lessons
                    </span>
                    <span
                      className="hidden h-4 w-px bg-gray-200 sm:inline-block"
                      aria-hidden
                    />
                    <span>Updated by your team</span>
                  </>
                ) : (
                  <span>
                    New programs appear here as your team publishes them.
                  </span>
                )}
              </div>
            </div>

            {/* Decorative preview — suggests folder / course structure */}
            <div
              className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none"
              aria-hidden
            >
              <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-500">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  Your courses
                </div>
                <div className="space-y-2">
                  {[
                    {
                      name: "Sample course",
                      tone: "bg-blue-500",
                      sub: "3 topics",
                    },
                    {
                      name: "Another track",
                      tone: "bg-emerald-500",
                      sub: "5 topics",
                    },
                    {
                      name: "Skills path",
                      tone: "bg-violet-500",
                      sub: "2 topics",
                    },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.tone}`}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {row.name}
                          </p>
                          <p className="text-xs text-gray-500">{row.sub}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-gray-400">
                  Preview only — your real catalog lives under Courses
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            Built for learners, not dashboards
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
            Fewer distractions, clearer steps—so you spend time learning, not
            hunting for the next page.
          </p>
        </div>
        <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3 sm:gap-6">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="rounded-2xl border border-gray-200/90 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {text}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section
        id="steps"
        className="scroll-mt-24 border-y border-gray-200/80 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              How it works
            </h2>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              Three steps from the home page to your next lesson.
            </p>
          </div>
          <ol className="mx-auto mt-12 grid gap-6 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="rounded-2xl border border-gray-100 bg-slate-50/50 p-5 text-left sm:border-0 sm:bg-transparent sm:p-0 sm:text-center"
              >
                <div className="mb-3 flex items-center gap-3 sm:mb-4 sm:justify-center sm:gap-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      className="h-px flex-1 bg-gray-200 sm:hidden"
                      aria-hidden
                    />
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-gray-200 bg-slate-900 px-6 py-12 text-center sm:px-10 sm:py-14">
          <BookOpen className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-white sm:text-2xl">
            Start with any course
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
            Open the full list, pick a program, and jump into the first topic
            when you are ready.
          </p>
          <div className="mt-8">
            <Link to="/courses">
              <Button
                size="lg"
                className="h-11 gap-2 rounded-lg bg-white px-6 text-[15px] font-medium text-slate-900 hover:bg-slate-100"
              >
                Go to courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-gray-900">Life Computer</p>
            <p className="mt-1 max-w-xs text-sm text-gray-500">
              A simple home for courses, topics, and day-by-day lessons.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link
              to="/courses"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              Courses
            </Link>
            <Link
              to="/admin/login"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              Staff sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
