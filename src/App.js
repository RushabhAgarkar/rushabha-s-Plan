import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Circle,
  ChevronRight,
  Upload,
  Plus,
  RefreshCcw,
  Trophy,
  Star,
  BookOpen,
  Calendar,
  BarChart3,
  User,
  FileText,
  ListTodo,
} from 'lucide-react';

/*
  60-Day Task & Level-Up App (Single-File React)
  - TailwindCSS styling (no import required in this environment)
  - shadcn/ui style minimal components (hand-rolled here to keep single-file)
  - LocalStorage persistence
  - Daily tasks with submission notes + optional link
  - Level system: 10 XP per task; streak bonus; level thresholds = 50 * level
  - Streak = consecutive days with all tasks completed
*/

// ---------- Minimal UI Primitives ----------
const Card = ({ className = '', children }) => (
  <div
    className={`rounded-2xl shadow-sm border border-neutral-200 bg-white ${className}`}
  >
    {children}
  </div>
);
const CardHeader = ({ className = '', children }) => (
  <div className={`px-5 pt-5 ${className}`}>{children}</div>
);
const CardContent = ({ className = '', children }) => (
  <div className={`px-5 pb-5 ${className}`}>{children}</div>
);
const Button = ({
  className = '',
  children,
  onClick,
  variant = 'default',
  type = 'button',
  disabled,
}) => {
  const base =
    'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none active:scale-[.98] transition';
  const looks = {
    default: 'bg-neutral-900 text-white hover:bg-neutral-800',
    subtle: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100',
    success: 'bg-green-600 text-white hover:bg-green-500',
    warn: 'bg-amber-500 text-white hover:bg-amber-400',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${looks[variant]} ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
};
const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none ${className}`}
    {...props}
  />
);
const Textarea = ({ className = '', ...props }) => (
  <textarea
    className={`w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none ${className}`}
    {...props}
  />
);
const Badge = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs ${className}`}
  >
    {children}
  </span>
);

// ---------- Helpers ----------
const KEY = 'mba60_progress_v1';
const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultDays = [
  {
    day: 1,
    title: 'Excel — Setup & Basics',
    tasks: [
      {
        id: 'd1t1',
        text: 'A1:A50 numbers via fill (no manual typing)',
        xp: 10,
      },
      {
        id: 'd1t2',
        text: 'Fill Names list down to 20 rows (Ctrl+D / drag)',
        xp: 10,
      },
      { id: 'd1t3', text: 'Write =SUM(A1:A50) and get total', xp: 10 },
      {
        id: 'd1t4',
        text: 'Post a screenshot to LinkedIn OR save locally as proof',
        xp: 10,
      },
    ],
  },
  {
    day: 2,
    title: 'Excel — Functions Starter',
    tasks: [
      {
        id: 'd2t1',
        text: 'Use COUNTIFS on a simple table (>= criteria)',
        xp: 10,
      },
      { id: 'd2t2', text: 'Make a PivotTable from a sales-like table', xp: 10 },
      { id: 'd2t3', text: 'One clean bar/line chart from the Pivot', xp: 10 },
    ],
  },
  {
    day: 3,
    title: 'Excel — Lookup Family',
    tasks: [
      { id: 'd3t1', text: 'XLOOKUP to fetch price by product', xp: 10 },
      { id: 'd3t2', text: 'IF + IFS combo on grading (A/B/C)', xp: 10 },
      { id: 'd3t3', text: 'Clean data with TRIM + TEXTSPLIT', xp: 10 },
    ],
  },
  {
    day: 4,
    title: 'Power BI — Import & Clean',
    tasks: [
      {
        id: 'd4t1',
        text: 'Import CSV in Power Query; remove blanks; change types',
        xp: 10,
      },
      {
        id: 'd4t2',
        text: 'Create Calendar table; mark date relationships',
        xp: 10,
      },
    ],
  },
  {
    day: 5,
    title: 'Power BI — Measures & Visuals',
    tasks: [
      {
        id: 'd5t1',
        text: 'Create basic measures: Total Sales, Total Qty',
        xp: 10,
      },
      { id: 'd5t2', text: 'Report with 3 visuals (card, bar, line)', xp: 10 },
    ],
  },
  {
    day: 6,
    title: 'SQL — Read & Filter',
    tasks: [
      {
        id: 'd6t1',
        text: 'SELECT * FROM table LIMIT 10; understand columns',
        xp: 10,
      },
      { id: 'd6t2', text: 'WHERE with AND/OR; practice 5 queries', xp: 10 },
    ],
  },
  {
    day: 7,
    title: 'SQL — Aggregate & JOIN',
    tasks: [
      { id: 'd7t1', text: 'GROUP BY + HAVING; 3 queries', xp: 10 },
      { id: 'd7t2', text: 'INNER JOIN two tables; 3 queries', xp: 10 },
    ],
  },
];

// Fill until Day 60 with placeholders the user can edit
for (let d = 8; d <= 60; d++) {
  defaultDays.push({
    day: d,
    title: `Custom Plan — Day ${d}`,
    tasks: [{ id: `d${d}t1`, text: 'Add your task here', xp: 10 }],
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

const initialState = () => {
  const saved = loadState();
  if (saved) return saved;
  return {
    startedOn: todayISO(),
    currentDay: 1,
    days: defaultDays,
    submissions: {}, // key: `${dayId}-${taskId}` -> {note, link, done, when}
    xp: 0,
    level: 1,
    streak: 0,
    lastFullCompleteDay: 0,
  };
};

// Level threshold: need 50 * currentLevel XP to reach next
const levelThreshold = (level) => 50 * level;

function usePersistentState() {
  const [state, setState] = useState(initialState);
  useEffect(() => saveState(state), [state]);
  return [state, setState];
}

function useProgress(state) {
  const totalTasks = useMemo(
    () => state.days.reduce((acc, d) => acc + d.tasks.length, 0),
    [state.days]
  );
  const doneCount = useMemo(() => {
    return Object.values(state.submissions).filter((s) => s.done).length;
  }, [state.submissions]);
  return { totalTasks, doneCount };
}

function xpAfterComplete(currentXP, level) {
  // no change; xp added directly per task
  let lvl = level;
  let xp = currentXP;
  let threshold = levelThreshold(lvl);
  while (xp >= threshold) {
    xp -= threshold;
    lvl += 1;
    threshold = levelThreshold(lvl);
  }
  return { xp, level: lvl };
}

function Header({ level, xp, streak, onExport, onImport, onReset }) {
  const threshold = levelThreshold(level);
  const pct = Math.min(100, Math.round((xp / threshold) * 100));
  const fileRef = useRef(null);
  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const obj = JSON.parse(text);
      onImport && onImport(obj);
    } catch (err) {
      alert('Invalid JSON file.');
    } finally {
      e.target.value = '';
    }
  };
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          60-Day Finance Skills — Tracker
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Complete tasks, submit proof, and level up. Streak bonus for finishing
          a full day.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge>
          <User className="w-3.5 h-3.5" /> Level{' '}
          <strong className="ml-1">{level}</strong>
        </Badge>
        <Badge>
          <Trophy className="w-3.5 h-3.5" /> Streak{' '}
          <strong className="ml-1">{streak}</strong> days
        </Badge>
      </div>
      <div className="w-full md:w-80">
        <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
          <span>XP</span>
          <span>
            {xp} / {threshold}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            className="h-full bg-neutral-900"
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button variant="subtle" onClick={onExport}>
            <FileText className="w-4 h-4" /> Export
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFile}
          />
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="danger" onClick={onReset}>
            <RefreshCcw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

function DayPicker({ state, setState }) {
  const [dayInput, setDayInput] = useState(state.currentDay.toString());
  const maxDay = state.days.length;
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Select Day</h2>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={dayInput}
              onChange={(e) =>
                setDayInput(e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="Day #"
              style={{ width: 90 }}
            />
            <Button
              onClick={() => {
                const d = Math.max(
                  1,
                  Math.min(maxDay, parseInt(dayInput || '1', 10))
                );
                setState((s) => ({ ...s, currentDay: d }));
              }}
            >
              Go <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {state.days.slice(0, 60).map((d) => (
            <button
              key={d.day}
              onClick={() => setState((s) => ({ ...s, currentDay: d.day }))}
              className={`px-3 py-1.5 rounded-xl text-xs border ${
                state.currentDay === d.day
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ day, task, submission, onToggle, onSave }) {
  const [note, setNote] = useState(submission?.note || '');
  const [link, setLink] = useState(submission?.link || '');

  useEffect(() => {
    setNote(submission?.note || '');
    setLink(submission?.link || '');
  }, [submission]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 inline-flex items-center justify-center rounded-full border ${
            submission?.done
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-neutral-700 border-neutral-300'
          }`}
        >
          {submission?.done ? (
            <Check className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
        <div
          className={`text-sm ${
            submission?.done
              ? 'line-through text-neutral-400'
              : 'text-neutral-800'
          }`}
        >
          {task.text}
        </div>
        <Badge className="ml-auto">
          <Star className="w-3.5 h-3.5" /> {task.xp} XP
        </Badge>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <Input
          placeholder="Notes / what you did"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Input
          placeholder="Link to proof (Drive / LinkedIn / etc)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="subtle" onClick={() => onSave({ note, link })}>
          <Upload className="w-4 h-4" /> Save Submission
        </Button>
      </div>
    </div>
  );
}

function DayView({ state, setState }) {
  const dayObj =
    state.days.find((d) => d.day === state.currentDay) || state.days[0];
  const allDone = dayObj.tasks.every(
    (t) => !!state.submissions[`${dayObj.day}-${t.id}`]?.done
  );

  const toggleTask = (task) => {
    const key = `${dayObj.day}-${task.id}`;
    setState((s) => {
      const prev = s.submissions[key] || {};
      const newDone = !prev.done;
      let xp = s.xp + (newDone ? task.xp : -task.xp);
      if (xp < 0) xp = 0;
      // handle level ups/downs simply by recomputing from 0 (idempotent):
      // compute raw total XP from submissions
      const totalXP = Object.entries({
        ...s.submissions,
        [key]: { ...prev, done: newDone },
      }).reduce(
        (acc, [k, v]) => acc + (v.done ? findTaskXP(s.days, k) || 0 : 0),
        0
      );
      // Convert total to (level,xp) by consuming thresholds
      let lvl = 1;
      let residual = totalXP;
      let th = levelThreshold(lvl);
      while (residual >= th) {
        residual -= th;
        lvl++;
        th = levelThreshold(lvl);
      }
      return {
        ...s,
        submissions: {
          ...s.submissions,
          [key]: {
            ...prev,
            done: newDone,
            when: newDone ? new Date().toISOString() : undefined,
          },
        },
        xp: residual,
        level: lvl,
      };
    });
  };

  const saveSubmission = (task, payload) => {
    const key = `${dayObj.day}-${task.id}`;
    setState((s) => ({
      ...s,
      submissions: {
        ...s.submissions,
        [key]: { ...(s.submissions[key] || {}), ...payload },
      },
    }));
  };

  useEffect(() => {
    // If all tasks done today and first time achieving full day, update streak
    const keyDay = `__day_complete_${dayObj.day}`;
    const marked = localStorage.getItem(keyDay);
    if (
      !marked &&
      dayObj.tasks.length > 0 &&
      dayObj.tasks.every((t) => sGetDone(state, dayObj.day, t.id))
    ) {
      setState((s) => ({
        ...s,
        streak: s.streak + 1,
        lastFullCompleteDay: dayObj.day,
      }));
      localStorage.setItem(keyDay, '1');
      // bonus XP for full day completion
      setState((s) => {
        // recompute total xp then add 10 bonus
        const totalXP =
          Object.entries(s.submissions).reduce(
            (acc, [k, v]) => acc + (v.done ? findTaskXP(s.days, k) || 0 : 0),
            0
          ) + 10;
        let lvl = 1;
        let residual = totalXP;
        let th = levelThreshold(lvl);
        while (residual >= th) {
          residual -= th;
          lvl++;
          th = levelThreshold(lvl);
        }
        return { ...s, xp: residual, level: lvl };
      });
    }
  }, [state.submissions, state.currentDay]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5" />
          <h3 className="text-xl font-semibold">
            Day {dayObj.day}: {dayObj.title}
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {dayObj.tasks.map((task) => (
            <TaskRow
              key={task.id}
              day={dayObj.day}
              task={task}
              submission={state.submissions[`${dayObj.day}-${task.id}`]}
              onToggle={() => toggleTask(task)}
              onSave={(payload) => saveSubmission(task, payload)}
            />
          ))}
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-neutral-600">
              {
                dayObj.tasks.filter((t) => sGetDone(state, dayObj.day, t.id))
                  .length
              }
              /{dayObj.tasks.length} done
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    currentDay: Math.max(1, dayObj.day - 1),
                  }))
                }
              >
                <RefreshCcw className="w-4 h-4 rotate-180" /> Prev
              </Button>
              <Button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    currentDay: Math.min(60, dayObj.day + 1),
                  }))
                }
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function sGetDone(state, day, taskId) {
  return !!state.submissions[`${day}-${taskId}`]?.done;
}
function findTaskXP(days, key) {
  const [dStr, tId] = key.split('-');
  const dayNum = parseInt(dStr, 10);
  const dayObj = days.find((d) => d.day === dayNum);
  const task = dayObj?.tasks.find((t) => t.id === tId);
  return task?.xp || 0;
}

function AddTask({ state, setState }) {
  const [text, setText] = useState('');
  const [xp, setXp] = useState('10');
  const add = () => {
    const trimmed = text.trim();
    const nXp = Math.max(0, parseInt(xp || '0', 10));
    if (!trimmed) return;
    setState((s) => {
      const days = s.days.map((d) => {
        if (d.day !== s.currentDay) return d;
        const id = `d${d.day}t${d.tasks.length + 1}`;
        return { ...d, tasks: [...d.tasks, { id, text: trimmed, xp: nXp }] };
      });
      return { ...s, days };
    });
    setText('');
    setXp('10');
  };
  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Add Task to Day {state.currentDay}
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-6 gap-2">
          <div className="md:col-span-4">
            <Input
              placeholder="Task description"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <Input
              placeholder="XP"
              value={xp}
              onChange={(e) => setXp(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          <div className="md:col-span-1">
            <Button onClick={add}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBoard({ state }) {
  const { totalTasks, doneCount } = useProgress(state);
  const percent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Overall Progress</h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-neutral-600">Tasks Completed</div>
            <div className="text-2xl font-semibold">
              {doneCount} / {totalTasks}
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-xs text-neutral-600">Percent Done</div>
            <div className="text-2xl font-semibold">{percent}%</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-xs text-neutral-600">Last Full Day</div>
            <div className="text-2xl font-semibold">
              {state.lastFullCompleteDay || '—'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FooterTips() {
  return (
    <div className="text-xs text-neutral-500 mt-6 text-center">
      <p>
        Tip: Full-day completion gives +10 bonus XP and increases your streak.
      </p>
      <p className="mt-1">
        Your progress is saved automatically in your browser.
      </p>
    </div>
  );
}

export default function App() {
  const [state, setState] = usePersistentState();

  const doExport = () => {
    try {
      const data = JSON.stringify(state, null, 2);
      const a = document.createElement('a');
      a.href = 'data:application/json,' + encodeURIComponent(data);
      a.download = 'mba60_progress.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Export failed');
    }
  };
  const doImport = (obj) => {
    try {
      if (!obj || typeof obj !== 'object') throw new Error('bad');
      setState(obj);
      alert('Imported successfully.');
    } catch (e) {
      alert('Import failed.');
    }
  };
  const doReset = () => {
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    try {
      // clear day completion flags
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('__day_complete_') || k === KEY)) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
    setState(initialState());
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <Header
          level={state.level}
          xp={state.xp}
          streak={state.streak}
          onExport={doExport}
          onImport={doImport}
          onReset={doReset}
        />
        <DayPicker state={state} setState={setState} />
        <DayView state={state} setState={setState} />
        <AddTask state={state} setState={setState} />
        <ProgressBoard state={state} />
        <FooterTips />
      </div>
    </div>
  );
}
