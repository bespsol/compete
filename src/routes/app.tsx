import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleGauge,
  ClipboardList,
  FileCheck2,
  FileUp,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Swords,
  Users,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { z } from 'zod'
import { Brand } from '../components/brand'
import {
  api,
  clearSessionToken,
  formatDate,
  getSessionToken,
  titleCase,
} from '../lib/api'

const viewSchema = z.enum([
  'overview',
  'events',
  'fight-card',
  'fighters',
  'gyms',
  'rosters',
  'compliance',
])

export const Route = createFileRoute('/app')({
  validateSearch: z.object({ view: viewSchema.default('overview') }),
  component: AppPage,
})

type View = z.infer<typeof viewSchema>
type User = {
  userId: string
  firstName: string
  lastName: string
  email: string
  roles: string[]
}
type Dashboard = {
  stats: { activeEvents: number; fighters: number; gyms: number; openBouts: number }
  events: EventItem[]
  notifications: NotificationItem[]
}
type EventItem = {
  eventId: string
  name: string
  eventType: string
  status: string
  description?: string
  venueName: string
  venueAddress?: string
  startsAt: string
  endsAt: string
  rosterDeadlineAt?: string
  plannedBoutCount?: number
  boutCount?: number
  rosterCount?: number
}
type Gym = {
  gymId: string
  name: string
  townCity?: string
  email?: string
  phone?: string
  fighterCount: number
}
type Fighter = {
  fighterId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  currentWeightKg?: number
  heightCm?: number
  stance?: string
  experienceSummary?: string
  gymId?: string
  gymName?: string
}
type Bout = {
  boutId: string
  boutNumber: number
  status: string
  discipline: string
  boutClass?: string
  numberOfRounds: number
  roundLengthSeconds: number
  weightDivision?: string
  contractWeightKg?: number
  beltTitle?: string
  scheduledAt?: string
  redFighterId?: string
  redFighter?: string
  blueFighterId?: string
  blueFighter?: string
  decision?: string
}
type Roster = {
  rosterId: string
  gymId: string
  gymName: string
  status: string
  notes?: string
  submittedAt?: string
  fighterCount: number
}
type Invitation = {
  invitationId: string
  gymName: string
  status: string
  message?: string
  fighterCriteria?: string
  sentAt: string
}
type WeighIn = {
  weighInId: string
  fighterId: string
  fighterName: string
  weightKg: number
  weighedAt: string
  status: string
  notes?: string
}
type NotificationItem = {
  notificationId: string
  title: string
  message: string
  readAt?: string
  createdAt: string
}

type ApiState<T> = {
  data?: T
  loading: boolean
  error?: string
  reload: () => void
}

function useApiData<T>(path: string | null): ApiState<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState<string>()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(undefined)
    api<T>(path)
      .then((value) => {
        if (active) setData(value)
      })
      .catch((caught) => {
        if (!active) return
        if (caught && typeof caught === 'object' && 'status' in caught && caught.status === 401) {
          clearSessionToken()
          window.location.href = '/login'
          return
        }
        setError(caught instanceof Error ? caught.message : 'Unable to load this information.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [path, version])

  return {
    data,
    loading,
    error,
    reload: useCallback(() => setVersion((value) => value + 1), []),
  }
}

const navigation: { view: View; label: string; icon: typeof CircleGauge }[] = [
  { view: 'overview', label: 'Overview', icon: CircleGauge },
  { view: 'events', label: 'Events', icon: CalendarDays },
  { view: 'fight-card', label: 'Fight card', icon: Swords },
  { view: 'fighters', label: 'Fighters', icon: Users },
  { view: 'gyms', label: 'Gyms', icon: Building2 },
  { view: 'rosters', label: 'Rosters', icon: ClipboardList },
  { view: 'compliance', label: 'Weigh-ins & files', icon: FileCheck2 },
]

const viewTitles: Record<View, [string, string]> = {
  overview: ['Operations overview', 'The next deadlines and decisions across your account.'],
  events: ['Events', 'Plan, invite, publish and run every event format.'],
  'fight-card': ['Fight card', 'Build the running order and manage each corner.'],
  fighters: ['Fighters', 'Profiles, experience, gym links and medical context.'],
  gyms: ['Gyms', 'Contacts, coaches and active fighter counts.'],
  rosters: ['Invitations & rosters', 'Move from gym invitation to match-ready fighters.'],
  compliance: ['Weigh-ins & evidence', 'Keep verified weights and supporting documents together.'],
}

function AppPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [modal, setModal] = useState<string>()
  const [selectedEventId, setSelectedEventId] = useState<string>()
  const me = useApiData<{ user: User }>(getSessionToken() ? '/auth/me' : null)
  const dashboard = useApiData<Dashboard>('/dashboard')
  const events = useApiData<{ items: EventItem[] }>('/events')
  const gyms = useApiData<{ items: Gym[] }>('/gyms')
  const fighters = useApiData<{ items: Fighter[] }>('/fighters')

  useEffect(() => {
    if (!getSessionToken()) void navigate({ to: '/login' })
  }, [navigate])

  useEffect(() => {
    if (!selectedEventId && events.data?.items[0]) {
      setSelectedEventId(events.data.items[0].eventId)
    }
  }, [events.data, selectedEventId])

  const bouts = useApiData<{ items: Bout[] }>(
    selectedEventId ? `/events/${selectedEventId}/bouts` : null,
  )
  const rosters = useApiData<{ items: Roster[] }>(
    selectedEventId ? `/events/${selectedEventId}/rosters` : null,
  )
  const invitations = useApiData<{ items: Invitation[] }>(
    selectedEventId ? `/events/${selectedEventId}/invitations` : null,
  )
  const weighIns = useApiData<{ items: WeighIn[] }>(
    selectedEventId ? `/events/${selectedEventId}/weigh-ins` : null,
  )

  const roles = me.data?.user.roles ?? []
  const canPromote = roles.some((role) => role === 'promoter' || role === 'admin')
  const canCoach = roles.some((role) => role === 'coach' || role === 'admin')

  function changeView(view: View) {
    void navigate({ to: '/app', search: { view } })
    setSidebarOpen(false)
  }

  function reloadDomain() {
    dashboard.reload()
    events.reload()
    gyms.reload()
    fighters.reload()
    bouts.reload()
    rosters.reload()
    invitations.reload()
    weighIns.reload()
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      clearSessionToken()
      await navigate({ to: '/login' })
    }
  }

  if (!getSessionToken()) return null

  return (
    <div className="app-layout">
      <aside className={`app-sidebar ${sidebarOpen ? 'block' : ''}`}>
        <div className="mb-8 flex items-center justify-between px-2">
          <Brand inverse />
          <button className="text-white/50 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="grid gap-1">
          {navigation.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              className={`app-nav-item ${search.view === view ? 'active' : ''}`}
              onClick={() => changeView(view)}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-meta absolute bottom-5 left-4 right-4 rounded-lg border border-white/10 p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/35">Signed in as</p>
          <p className="mt-1 truncate text-xs font-semibold">
            {me.data ? `${me.data.user.firstName} ${me.data.user.lastName}` : 'Loading...'}
          </p>
          <p className="mt-1 truncate text-[10px] text-white/40">
            {roles.map(titleCase).join(' · ')}
          </p>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div className="flex items-center gap-3">
            <button className="text-ink lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu />
            </button>
            <div>
              <h1 className="heading text-2xl">{viewTitles[search.view][0]}</h1>
              <p className="mt-1 hidden text-xs text-muted sm:block">
                {viewTitles[search.view][1]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="button button-subtle !min-h-9 !p-2" onClick={reloadDomain} aria-label="Refresh data">
              <RefreshCw size={16} />
            </button>
            <button className="relative rounded-lg border border-line p-2 text-muted" aria-label="Notifications">
              <Bell size={18} />
              {dashboard.data?.notifications.some((item) => !item.readAt) && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red" />
              )}
            </button>
            <button className="button button-subtle !min-h-9" onClick={logout}>
              <LogOut size={16} /> <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        <div className="app-content">
          {search.view === 'overview' && (
            <Overview state={dashboard} onView={changeView} />
          )}
          {search.view === 'events' && (
            <EventsView
              state={events}
              canCreate={canPromote}
              onCreate={() => setModal('event')}
              onSelect={(eventId) => {
                setSelectedEventId(eventId)
                changeView('fight-card')
              }}
            />
          )}
          {search.view === 'fight-card' && (
            <FightCardView
              events={events.data?.items ?? []}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              state={bouts}
              canManage={canPromote}
              onCreate={() => setModal('bout')}
              onWithdraw={(bout) => setModal(`withdraw:${bout.boutId}`)}
              onDecision={(bout) => setModal(`decision:${bout.boutId}`)}
            />
          )}
          {search.view === 'fighters' && (
            <FightersView
              state={fighters}
              canCreate={canCoach || roles.includes('parent') || roles.includes('fighter')}
              onCreate={() => setModal('fighter')}
            />
          )}
          {search.view === 'gyms' && (
            <GymsView state={gyms} canCreate={canCoach || canPromote} onCreate={() => setModal('gym')} />
          )}
          {search.view === 'rosters' && (
            <RostersView
              events={events.data?.items ?? []}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              rosters={rosters}
              invitations={invitations}
              canPromote={canPromote}
              canCoach={canCoach}
              onInvite={() => setModal('invitation')}
              onRoster={() => setModal('roster')}
            />
          )}
          {search.view === 'compliance' && (
            <ComplianceView
              events={events.data?.items ?? []}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              state={weighIns}
              onWeighIn={() => setModal('weigh-in')}
              onUpload={() => setModal('document')}
            />
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modalTitle(modal)} onClose={() => setModal(undefined)}>
          {modal === 'event' && <EventForm onDone={() => { setModal(undefined); reloadDomain() }} />}
          {modal === 'gym' && <GymForm onDone={() => { setModal(undefined); reloadDomain() }} />}
          {modal === 'fighter' && (
            <FighterForm gyms={gyms.data?.items ?? []} onDone={() => { setModal(undefined); reloadDomain() }} />
          )}
          {modal === 'bout' && selectedEventId && (
            <BoutForm
              eventId={selectedEventId}
              fighters={fighters.data?.items ?? []}
              nextNumber={(bouts.data?.items.length ?? 0) + 1}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
          {modal === 'invitation' && selectedEventId && (
            <InvitationForm
              eventId={selectedEventId}
              gyms={gyms.data?.items ?? []}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
          {modal === 'roster' && selectedEventId && (
            <RosterForm
              eventId={selectedEventId}
              gyms={gyms.data?.items ?? []}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
          {modal === 'weigh-in' && selectedEventId && (
            <WeighInForm
              eventId={selectedEventId}
              fighters={fighters.data?.items ?? []}
              bouts={bouts.data?.items ?? []}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
          {modal === 'document' && (
            <DocumentForm
              eventId={selectedEventId}
              fighters={fighters.data?.items ?? []}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
          {modal.startsWith('withdraw:') && selectedEventId && (
            <WithdrawalForm
              eventId={selectedEventId}
              bout={bouts.data?.items.find((item) => item.boutId === modal.split(':')[1])}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
          {modal.startsWith('decision:') && (
            <DecisionForm
              bout={bouts.data?.items.find((item) => item.boutId === modal.split(':')[1])}
              onDone={() => { setModal(undefined); reloadDomain() }}
            />
          )}
        </Modal>
      )}
    </div>
  )
}

function modalTitle(modal: string) {
  if (modal.startsWith('withdraw:')) return 'Withdraw fighter'
  if (modal.startsWith('decision:')) return 'Record decision'
  return titleCase(modal)
}

function Overview({
  state,
  onView,
}: {
  state: ApiState<Dashboard>
  onView: (view: View) => void
}) {
  if (state.loading) return <LoadingGrid />
  if (state.error || !state.data) return <LoadError message={state.error} reload={state.reload} />
  const stats = [
    ['Active events', state.data.stats.activeEvents, CalendarDays, 'text-blue'],
    ['Registered fighters', state.data.stats.fighters, Users, 'text-red'],
    ['Active gyms', state.data.stats.gyms, Building2, 'text-blue'],
    ['Open bouts', state.data.stats.openBouts, Swords, 'text-red'],
  ] as const

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon, color]) => (
          <div key={label} className="panel stat-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">{label}</p>
              <Icon size={19} className={color} />
            </div>
            <p className="heading mt-5 text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="panel">
          <PanelHeader title="Upcoming events" action="View all" onAction={() => onView('events')} />
          <div className="divide-y divide-line">
            {state.data.events.length ? state.data.events.map((event) => (
              <button
                key={event.eventId}
                className="grid w-full grid-cols-[56px_1fr_auto] items-center gap-4 p-4 text-left hover:bg-slate-50"
                onClick={() => onView('events')}
              >
                <DateTile value={event.startsAt} />
                <div>
                  <p className="text-sm font-semibold">{event.name}</p>
                  <p className="mt-1 text-xs text-muted">{event.venueName} · {titleCase(event.eventType)}</p>
                </div>
                <Status value={event.status} />
              </button>
            )) : <Empty compact title="No upcoming events" body="Create your first event to start inviting gyms." />}
          </div>
        </section>
        <section className="panel">
          <PanelHeader title="Recent notifications" />
          <div className="divide-y divide-line">
            {state.data.notifications.length ? state.data.notifications.map((item) => (
              <div key={item.notificationId} className="flex gap-3 p-4">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-slate-300' : 'bg-red'}`} />
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.message}</p>
                  <p className="mt-2 text-[10px] text-slate-400">{formatDate(item.createdAt)}</p>
                </div>
              </div>
            )) : <Empty compact title="Nothing new" body="Updates from promoters, gyms and officials appear here." />}
          </div>
        </section>
      </div>
    </div>
  )
}

function EventsView({
  state,
  canCreate,
  onCreate,
  onSelect,
}: {
  state: ApiState<{ items: EventItem[] }>
  canCreate: boolean
  onCreate: () => void
  onSelect: (id: string) => void
}) {
  if (state.loading) return <LoadingGrid />
  if (state.error || !state.data) return <LoadError message={state.error} reload={state.reload} />
  return (
    <div className="grid gap-5">
      <Toolbar
        placeholder="Search events"
        action={canCreate ? 'Create event' : undefined}
        onAction={onCreate}
      />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {state.data.items.map((event) => (
          <button key={event.eventId} onClick={() => onSelect(event.eventId)} className="panel overflow-hidden text-left hover:border-slate-400">
            <div className="h-2 bg-ink">
              <div className={`h-full w-1/3 ${event.status === 'published' ? 'bg-blue' : 'bg-gold'}`} />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-blue">{titleCase(event.eventType)}</p>
                  <h3 className="heading mt-2 text-2xl">{event.name}</h3>
                </div>
                <Status value={event.status} />
              </div>
              <p className="mt-4 line-clamp-2 min-h-10 text-xs leading-5 text-muted">
                {event.description ?? 'No event description has been added yet.'}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
                <div>
                  <p className="text-slate-400">Starts</p>
                  <p className="mt-1 font-semibold">{formatDate(event.startsAt)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Venue</p>
                  <p className="mt-1 truncate font-semibold">{event.venueName}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-[11px] text-muted">
                <span>{event.boutCount ?? 0} bouts</span>
                <span>{event.rosterCount ?? 0} rosters</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {!state.data.items.length && <Empty title="No events yet" body="Promoters can create an event and begin inviting gyms." />}
    </div>
  )
}

function FightCardView({
  events,
  selectedEventId,
  onSelectEvent,
  state,
  canManage,
  onCreate,
  onWithdraw,
  onDecision,
}: {
  events: EventItem[]
  selectedEventId?: string
  onSelectEvent: (id: string) => void
  state: ApiState<{ items: Bout[] }>
  canManage: boolean
  onCreate: () => void
  onWithdraw: (bout: Bout) => void
  onDecision: (bout: Bout) => void
}) {
  return (
    <div className="grid gap-5">
      <EventToolbar
        events={events}
        value={selectedEventId}
        onChange={onSelectEvent}
        action={canManage ? 'Add bout' : undefined}
        onAction={onCreate}
      />
      {state.loading ? <LoadingGrid /> : state.error || !state.data ? (
        <LoadError message={state.error} reload={state.reload} />
      ) : state.data.items.length ? (
        <div className="grid gap-3">
          {state.data.items.map((bout) => (
            <article key={bout.boutId} className="panel overflow-hidden">
              <div className="grid md:grid-cols-[90px_1fr_130px_1fr_160px] md:items-stretch">
                <div className="grid place-items-center bg-ink p-4 text-center text-white">
                  <span className="eyebrow text-white/45">Bout</span>
                  <span className="heading mt-1 text-4xl">{bout.boutNumber}</span>
                  <Status value={bout.status} />
                </div>
                <Corner color="red" name={bout.redFighter} meta={bout.contractWeightKg ? `${bout.contractWeightKg} kg` : undefined} />
                <div className="grid place-items-center border-y border-line p-4 text-center md:border-x md:border-y-0">
                  <span className="heading text-2xl">VS</span>
                  <span className="mt-2 text-[10px] text-muted">{bout.numberOfRounds} × {Math.round(bout.roundLengthSeconds / 60)} min</span>
                </div>
                <Corner color="blue" name={bout.blueFighter} meta={bout.boutClass} />
                <div className="flex flex-col justify-center gap-2 p-4">
                  <p className="text-xs font-semibold">{bout.discipline}</p>
                  <p className="text-[11px] text-muted">{bout.weightDivision ?? 'Open division'}</p>
                  {bout.beltTitle && <p className="text-[11px] font-semibold text-gold">{bout.beltTitle}</p>}
                  {canManage && bout.status !== 'completed' && (
                    <div className="mt-1 flex gap-2">
                      <button className="text-[10px] font-semibold text-red" onClick={() => onWithdraw(bout)}>Pull out</button>
                      <button className="text-[10px] font-semibold text-blue" onClick={() => onDecision(bout)}>Decision</button>
                    </div>
                  )}
                  {bout.decision && <p className="mt-1 text-[10px] font-semibold">{bout.decision}</p>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="The card is open" body="Add the first bout, choose each corner and set the running order." />
      )}
    </div>
  )
}

function FightersView({
  state,
  canCreate,
  onCreate,
}: {
  state: ApiState<{ items: Fighter[] }>
  canCreate: boolean
  onCreate: () => void
}) {
  if (state.loading) return <LoadingGrid />
  if (state.error || !state.data) return <LoadError message={state.error} reload={state.reload} />
  return (
    <div className="grid gap-5">
      <Toolbar placeholder="Search fighters" action={canCreate ? 'Add fighter' : undefined} onAction={onCreate} />
      <section className="panel table-wrap">
        <table className="data-table">
          <thead><tr><th>Fighter</th><th>Gym</th><th>Weight</th><th>Height</th><th>Stance</th><th>Experience</th></tr></thead>
          <tbody>
            {state.data.items.map((fighter) => (
              <tr key={fighter.fighterId}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${fighter.firstName} ${fighter.lastName}`} />
                    <div>
                      <p className="font-semibold">{fighter.firstName} {fighter.lastName}</p>
                      <p className="mt-1 text-[10px] text-muted">{formatDate(fighter.dateOfBirth, false)}</p>
                    </div>
                  </div>
                </td>
                <td>{fighter.gymName ?? 'Independent'}</td>
                <td>{fighter.currentWeightKg ? `${fighter.currentWeightKg} kg` : '—'}</td>
                <td>{fighter.heightCm ? `${fighter.heightCm} cm` : '—'}</td>
                <td>{fighter.stance ? titleCase(fighter.stance) : '—'}</td>
                <td className="max-w-xs truncate text-muted">{fighter.experienceSummary ?? 'Not provided'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!state.data.items.length && <Empty title="No fighters registered" body="Add a fighter profile and associate it with a gym." />}
      </section>
    </div>
  )
}

function GymsView({
  state,
  canCreate,
  onCreate,
}: {
  state: ApiState<{ items: Gym[] }>
  canCreate: boolean
  onCreate: () => void
}) {
  if (state.loading) return <LoadingGrid />
  if (state.error || !state.data) return <LoadError message={state.error} reload={state.reload} />
  return (
    <div className="grid gap-5">
      <Toolbar placeholder="Search gyms" action={canCreate ? 'Register gym' : undefined} onAction={onCreate} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {state.data.items.map((gym) => (
          <article key={gym.gymId} className="panel p-5">
            <div className="flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-white">
                <Building2 size={20} />
              </div>
              <span className="status status-blue">{gym.fighterCount} fighters</span>
            </div>
            <h3 className="heading mt-5 text-2xl">{gym.name}</h3>
            <p className="mt-2 text-xs text-muted">{gym.townCity ?? 'Location not provided'}</p>
            <div className="mt-5 border-t border-line pt-4 text-xs leading-6 text-muted">
              <p>{gym.email ?? 'No email address'}</p>
              <p>{gym.phone ?? 'No phone number'}</p>
            </div>
          </article>
        ))}
      </div>
      {!state.data.items.length && <Empty title="No gyms registered" body="Create a gym profile so coaches and fighters can be associated." />}
    </div>
  )
}

function RostersView({
  events,
  selectedEventId,
  onSelectEvent,
  rosters,
  invitations,
  canPromote,
  canCoach,
  onInvite,
  onRoster,
}: {
  events: EventItem[]
  selectedEventId?: string
  onSelectEvent: (id: string) => void
  rosters: ApiState<{ items: Roster[] }>
  invitations: ApiState<{ items: Invitation[] }>
  canPromote: boolean
  canCoach: boolean
  onInvite: () => void
  onRoster: () => void
}) {
  const [responding, setResponding] = useState<string>()

  async function respond(invitationId: string, status: 'accepted' | 'declined') {
    setResponding(invitationId)
    try {
      await api(`/invitations/${invitationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      invitations.reload()
    } finally {
      setResponding(undefined)
    }
  }

  return (
    <div className="grid gap-5">
      <EventToolbar
        events={events}
        value={selectedEventId}
        onChange={onSelectEvent}
        action={canPromote ? 'Invite gym' : canCoach ? 'Submit roster' : undefined}
        onAction={canPromote ? onInvite : onRoster}
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel">
          <PanelHeader title="Gym invitations" action={canPromote ? 'New invitation' : undefined} onAction={onInvite} />
          {invitations.loading ? <PanelLoading /> : invitations.error ? (
            <LoadError message={invitations.error} reload={invitations.reload} compact />
          ) : (
            <div className="divide-y divide-line">
              {invitations.data?.items.map((item) => (
                <div key={item.invitationId} className="flex items-start gap-3 p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100"><Building2 size={17} /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{item.gymName}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.message ?? 'No message included.'}</p>
                    <p className="mt-2 text-[10px] text-slate-400">Sent {formatDate(item.sentAt)}</p>
                    {canCoach && ['sent', 'viewed'].includes(item.status) && (
                      <div className="mt-2 flex gap-3">
                        <button
                          className="text-[10px] font-bold text-blue"
                          disabled={responding === item.invitationId}
                          onClick={() => respond(item.invitationId, 'accepted')}
                        >
                          Accept
                        </button>
                        <button
                          className="text-[10px] font-bold text-red"
                          disabled={responding === item.invitationId}
                          onClick={() => respond(item.invitationId, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                  <Status value={item.status} />
                </div>
              ))}
              {!invitations.data?.items.length && <Empty compact title="No invitations sent" body="Invite selected gyms and describe the fighters you need." />}
            </div>
          )}
        </section>
        <section className="panel">
          <PanelHeader title="Submitted rosters" action={canCoach ? 'New roster' : undefined} onAction={onRoster} />
          {rosters.loading ? <PanelLoading /> : rosters.error ? (
            <LoadError message={rosters.error} reload={rosters.reload} compact />
          ) : (
            <div className="divide-y divide-line">
              {rosters.data?.items.map((item) => (
                <div key={item.rosterId} className="flex items-center gap-3 p-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue/10 text-blue"><ClipboardList size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{item.gymName}</p>
                    <p className="mt-1 text-[11px] text-muted">{item.fighterCount} available fighters</p>
                  </div>
                  <Status value={item.status} />
                </div>
              ))}
              {!rosters.data?.items.length && <Empty compact title="No rosters received" body="Accepted gyms can submit their available fighters here." />}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ComplianceView({
  events,
  selectedEventId,
  onSelectEvent,
  state,
  onWeighIn,
  onUpload,
}: {
  events: EventItem[]
  selectedEventId?: string
  onSelectEvent: (id: string) => void
  state: ApiState<{ items: WeighIn[] }>
  onWeighIn: () => void
  onUpload: () => void
}) {
  return (
    <div className="grid gap-5">
      <EventToolbar events={events} value={selectedEventId} onChange={onSelectEvent} action="Record weigh-in" onAction={onWeighIn} />
      <div className="flex justify-end">
        <button className="button button-subtle" onClick={onUpload}><FileUp size={16} /> Upload evidence</button>
      </div>
      {state.loading ? <LoadingGrid /> : state.error || !state.data ? (
        <LoadError message={state.error} reload={state.reload} />
      ) : (
        <section className="panel table-wrap">
          <table className="data-table">
            <thead><tr><th>Fighter</th><th>Recorded weight</th><th>Time</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {state.data.items.map((item) => (
                <tr key={item.weighInId}>
                  <td className="font-semibold">{item.fighterName}</td>
                  <td><span className="heading text-lg">{item.weightKg}</span> kg</td>
                  <td>{formatDate(item.weighedAt)}</td>
                  <td><Status value={item.status} /></td>
                  <td className="text-muted">{item.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.data.items.length && <Empty title="No weigh-ins recorded" body="Record a fighter's weight and upload supporting evidence." />}
        </section>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/55 backdrop-blur-sm" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-6 py-5">
          <div>
            <p className="eyebrow text-blue">COMPETE workspace</p>
            <h2 className="heading mt-1 text-3xl">{title}</h2>
          </div>
          <button className="rounded-lg border border-line p-2 text-muted" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </aside>
    </div>
  )
}

function ApiForm({
  children,
  submitLabel,
  onSubmit,
}: {
  children: ReactNode
  submitLabel: string
  onSubmit: (form: FormData) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(new FormData(event.currentTarget))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The request could not be completed.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-5">
      {error && <div className="rounded-lg border border-red/20 bg-red/5 p-3 text-xs text-red">{error}</div>}
      {children}
      <button className="button button-dark mt-2 w-full" disabled={loading}>
        {loading ? <RefreshCw className="animate-spin" size={17} /> : <Plus size={17} />}
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}

function EventForm({ onDone }: { onDone: () => void }) {
  return (
    <ApiForm
      submitLabel="Create event"
      onSubmit={async (form) => {
        await api('/events', {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            eventType: form.get('eventType'),
            status: 'draft',
            description: form.get('description') || undefined,
            venueName: form.get('venueName'),
            venueAddress: form.get('venueAddress') || undefined,
            startsAt: new Date(String(form.get('startsAt'))).toISOString(),
            endsAt: new Date(String(form.get('endsAt'))).toISOString(),
            rosterDeadlineAt: form.get('rosterDeadlineAt')
              ? new Date(String(form.get('rosterDeadlineAt'))).toISOString()
              : undefined,
            plannedBoutCount: form.get('plannedBoutCount') ? Number(form.get('plannedBoutCount')) : undefined,
            boutSpacingMinutes: Number(form.get('boutSpacingMinutes') || 15),
          }),
        })
        onDone()
      }}
    >
      <Field name="name" label="Event name" required placeholder="North Star Fight Night 08" />
      <div className="grid grid-cols-2 gap-4">
        <SelectField name="eventType" label="Event type" options={['interclub', 'seminar', 'fight_night', 'competition']} />
        <Field name="plannedBoutCount" label="Planned bouts" type="number" min="1" />
      </div>
      <Field name="venueName" label="Venue name" required />
      <Field name="venueAddress" label="Venue address" />
      <div className="grid grid-cols-2 gap-4">
        <Field name="startsAt" label="Starts" type="datetime-local" required />
        <Field name="endsAt" label="Ends" type="datetime-local" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field name="rosterDeadlineAt" label="Roster deadline" type="datetime-local" />
        <Field name="boutSpacingMinutes" label="Bout spacing (min)" type="number" defaultValue="15" />
      </div>
      <TextAreaField name="description" label="Event description" rows={4} />
    </ApiForm>
  )
}

function GymForm({ onDone }: { onDone: () => void }) {
  return (
    <ApiForm
      submitLabel="Register gym"
      onSubmit={async (form) => {
        await api('/gyms', {
          method: 'POST',
          body: JSON.stringify(Object.fromEntries([...form.entries()].filter(([, value]) => value))),
        })
        onDone()
      }}
    >
      <Field name="name" label="Gym name" required />
      <div className="grid grid-cols-2 gap-4">
        <Field name="email" label="Contact email" type="email" />
        <Field name="phone" label="Contact phone" />
      </div>
      <Field name="websiteUrl" label="Website" type="url" placeholder="https://" />
      <Field name="addressLine1" label="Address" />
      <div className="grid grid-cols-2 gap-4">
        <Field name="townCity" label="Town or city" />
        <Field name="postcode" label="Postcode" />
      </div>
      <input type="hidden" name="countryCode" value="GB" />
      <TextAreaField name="bio" label="About the gym" rows={4} />
    </ApiForm>
  )
}

function FighterForm({ gyms, onDone }: { gyms: Gym[]; onDone: () => void }) {
  return (
    <ApiForm
      submitLabel="Add fighter"
      onSubmit={async (form) => {
        const value = Object.fromEntries(form.entries())
        await api('/fighters', {
          method: 'POST',
          body: JSON.stringify({
            ...value,
            gymId: value.gymId || undefined,
            heightCm: value.heightCm ? Number(value.heightCm) : undefined,
            currentWeightKg: value.currentWeightKg ? Number(value.currentWeightKg) : undefined,
            stance: value.stance || undefined,
          }),
        })
        onDone()
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field name="firstName" label="First name" required />
        <Field name="lastName" label="Last name" required />
      </div>
      <Field name="dateOfBirth" label="Date of birth" type="date" required />
      <SelectField
        name="gymId"
        label="Primary gym"
        emptyLabel="Independent / select later"
        options={gyms.map((gym) => ({ value: gym.gymId, label: gym.name }))}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field name="heightCm" label="Height (cm)" type="number" step="0.1" />
        <Field name="currentWeightKg" label="Current weight (kg)" type="number" step="0.1" />
      </div>
      <SelectField name="stance" label="Stance" emptyLabel="Not set" options={['orthodox', 'southpaw', 'switch']} />
      <TextAreaField name="experienceSummary" label="Previous experience" rows={3} />
      <TextAreaField name="medicalConditions" label="Medical conditions" rows={3} />
      <TextAreaField name="disabilities" label="Disabilities or adjustments" rows={3} />
    </ApiForm>
  )
}

function BoutForm({
  eventId,
  fighters,
  nextNumber,
  onDone,
}: {
  eventId: string
  fighters: Fighter[]
  nextNumber: number
  onDone: () => void
}) {
  const fighterOptions = fighters.map((fighter) => ({
    value: fighter.fighterId,
    label: `${fighter.firstName} ${fighter.lastName}${fighter.currentWeightKg ? ` · ${fighter.currentWeightKg} kg` : ''}`,
  }))
  return (
    <ApiForm
      submitLabel="Add bout to card"
      onSubmit={async (form) => {
        const value = Object.fromEntries(form.entries())
        await api(`/events/${eventId}/bouts`, {
          method: 'POST',
          body: JSON.stringify({
            boutNumber: Number(value.boutNumber),
            discipline: value.discipline,
            boutClass: value.boutClass || undefined,
            numberOfRounds: Number(value.numberOfRounds),
            roundLengthSeconds: Number(value.roundLengthSeconds),
            breakLengthSeconds: Number(value.breakLengthSeconds),
            weightDivision: value.weightDivision || undefined,
            contractWeightKg: value.contractWeightKg ? Number(value.contractWeightKg) : undefined,
            beltTitle: value.beltTitle || undefined,
            scheduledAt: value.scheduledAt ? new Date(String(value.scheduledAt)).toISOString() : undefined,
            redFighterId: value.redFighterId || undefined,
            blueFighterId: value.blueFighterId || undefined,
            status: 'confirmed',
          }),
        })
        onDone()
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field name="boutNumber" label="Bout number" type="number" defaultValue={String(nextNumber)} required />
        <Field name="scheduledAt" label="Scheduled time" type="datetime-local" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field name="discipline" label="Discipline" defaultValue="Muay Thai" required />
        <Field name="boutClass" label="Class" placeholder="N class" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field name="numberOfRounds" label="Rounds" type="number" defaultValue="3" required />
        <Field name="roundLengthSeconds" label="Round seconds" type="number" defaultValue="120" required />
        <Field name="breakLengthSeconds" label="Break seconds" type="number" defaultValue="60" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field name="weightDivision" label="Weight division" />
        <Field name="contractWeightKg" label="Contract kg" type="number" step="0.1" />
      </div>
      <Field name="beltTitle" label="Belt or title" />
      <div className="rounded-lg border-l-4 border-red bg-red/5 p-4">
        <SelectField name="redFighterId" label="Red corner" emptyLabel="Select fighter" options={fighterOptions} />
      </div>
      <div className="rounded-lg border-l-4 border-blue bg-blue/5 p-4">
        <SelectField name="blueFighterId" label="Blue corner" emptyLabel="Select fighter" options={fighterOptions} />
      </div>
    </ApiForm>
  )
}

function InvitationForm({ eventId, gyms, onDone }: { eventId: string; gyms: Gym[]; onDone: () => void }) {
  return (
    <ApiForm
      submitLabel="Send invitation"
      onSubmit={async (form) => {
        await api(`/events/${eventId}/invitations`, {
          method: 'POST',
          body: JSON.stringify({
            gymId: form.get('gymId'),
            message: form.get('message') || undefined,
            fighterCriteria: {
              disciplines: String(form.get('disciplines') || '').split(',').map((value) => value.trim()).filter(Boolean),
              classes: String(form.get('classes') || '').split(',').map((value) => value.trim()).filter(Boolean),
              weightRangeKg: form.get('minWeight') && form.get('maxWeight')
                ? { min: Number(form.get('minWeight')), max: Number(form.get('maxWeight')) }
                : undefined,
              notes: form.get('notes') || undefined,
            },
          }),
        })
        onDone()
      }}
    >
      <SelectField name="gymId" label="Invite gym" emptyLabel="Select gym" required options={gyms.map((gym) => ({ value: gym.gymId, label: gym.name }))} />
      <TextAreaField name="message" label="Message to the gym" rows={4} />
      <Field name="disciplines" label="Disciplines" placeholder="Muay Thai, K1" />
      <Field name="classes" label="Classes" placeholder="N class, C class, B class" />
      <div className="grid grid-cols-2 gap-4">
        <Field name="minWeight" label="Minimum kg" type="number" step="0.1" />
        <Field name="maxWeight" label="Maximum kg" type="number" step="0.1" />
      </div>
      <TextAreaField name="notes" label="Additional criteria" rows={3} />
    </ApiForm>
  )
}

function RosterForm({ eventId, gyms, onDone }: { eventId: string; gyms: Gym[]; onDone: () => void }) {
  return (
    <ApiForm
      submitLabel="Submit roster"
      onSubmit={async (form) => {
        await api(`/events/${eventId}/rosters`, {
          method: 'POST',
          body: JSON.stringify({
            gymId: form.get('gymId'),
            notes: form.get('notes') || undefined,
            submit: true,
          }),
        })
        onDone()
      }}
    >
      <SelectField name="gymId" label="Gym" emptyLabel="Select gym" required options={gyms.map((gym) => ({ value: gym.gymId, label: gym.name }))} />
      <TextAreaField name="notes" label="Roster notes" rows={5} placeholder="Availability, travel or matching information..." />
      <div className="rounded-lg bg-slate-50 p-4 text-xs leading-5 text-muted">
        This creates and submits the roster. Add individual fighters through the roster API or Postman collection.
      </div>
    </ApiForm>
  )
}

function WeighInForm({
  eventId,
  fighters,
  bouts,
  onDone,
}: {
  eventId: string
  fighters: Fighter[]
  bouts: Bout[]
  onDone: () => void
}) {
  return (
    <ApiForm
      submitLabel="Record weigh-in"
      onSubmit={async (form) => {
        await api('/weigh-ins', {
          method: 'POST',
          body: JSON.stringify({
            eventId,
            fighterId: form.get('fighterId'),
            boutId: form.get('boutId') || undefined,
            weightKg: Number(form.get('weightKg')),
            weighedAt: new Date(String(form.get('weighedAt'))).toISOString(),
            notes: form.get('notes') || undefined,
          }),
        })
        onDone()
      }}
    >
      <SelectField name="fighterId" label="Fighter" emptyLabel="Select fighter" required options={fighters.map((fighter) => ({ value: fighter.fighterId, label: `${fighter.firstName} ${fighter.lastName}` }))} />
      <SelectField name="boutId" label="Bout" emptyLabel="Not linked to a bout" options={bouts.map((bout) => ({ value: bout.boutId, label: `Bout ${bout.boutNumber}: ${bout.redFighter ?? 'TBC'} vs ${bout.blueFighter ?? 'TBC'}` }))} />
      <div className="grid grid-cols-2 gap-4">
        <Field name="weightKg" label="Weight (kg)" type="number" step="0.01" required />
        <Field name="weighedAt" label="Weighed at" type="datetime-local" required />
      </div>
      <TextAreaField name="notes" label="Notes" rows={3} />
    </ApiForm>
  )
}

function DocumentForm({ eventId, fighters, onDone }: { eventId?: string; fighters: Fighter[]; onDone: () => void }) {
  return (
    <ApiForm
      submitLabel="Upload document"
      onSubmit={async (form) => {
        const file = form.get('file')
        if (!(file instanceof File) || !file.size) throw new Error('Choose a file to upload.')
        const entityType = String(form.get('entityType'))
        const entityId = entityType === 'event' ? eventId : String(form.get('fighterId'))
        if (!entityId) throw new Error('Select the record this file belongs to.')
        const base64Content = await fileToBase64(file)
        await api('/documents', {
          method: 'POST',
          body: JSON.stringify({
            entityType,
            entityId,
            documentType: form.get('documentType'),
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            base64Content,
            isPrivate: true,
          }),
        })
        onDone()
      }}
    >
      <SelectField name="entityType" label="Attach to" options={[{ value: 'event', label: 'Selected event' }, { value: 'fighter', label: 'Fighter' }]} />
      <SelectField name="fighterId" label="Fighter (when applicable)" emptyLabel="Select fighter" options={fighters.map((fighter) => ({ value: fighter.fighterId, label: `${fighter.firstName} ${fighter.lastName}` }))} />
      <SelectField name="documentType" label="Document type" options={['weigh_in_evidence', 'profile_photo', 'medical_evidence', 'scorecard', 'promo_material']} />
      <div className="field">
        <label htmlFor="file">File (maximum 4 MB)</label>
        <input id="file" name="file" type="file" required />
      </div>
    </ApiForm>
  )
}

function WithdrawalForm({ eventId, bout, onDone }: { eventId: string; bout?: Bout; onDone: () => void }) {
  const available = [
    bout?.redFighterId && { value: bout.redFighterId, label: `Red: ${bout.redFighter}` },
    bout?.blueFighterId && { value: bout.blueFighterId, label: `Blue: ${bout.blueFighter}` },
  ].filter(Boolean) as { value: string; label: string }[]
  return (
    <ApiForm
      submitLabel="Confirm withdrawal"
      onSubmit={async (form) => {
        await api('/withdrawals', {
          method: 'POST',
          body: JSON.stringify({
            eventId,
            boutId: bout?.boutId,
            fighterId: form.get('fighterId'),
            reasonCategory: form.get('reasonCategory'),
            reasonDetails: form.get('reasonDetails'),
          }),
        })
        onDone()
      }}
    >
      <div className="rounded-lg border border-red/20 bg-red/5 p-4 text-xs leading-5 text-red">
        Pulling out a confirmed fighter cancels this bout and immediately notifies the promoter.
      </div>
      <SelectField name="fighterId" label="Fighter" emptyLabel="Select corner" required options={available} />
      <SelectField name="reasonCategory" label="Reason category" options={['injury', 'illness', 'weight', 'travel', 'availability', 'other']} />
      <TextAreaField name="reasonDetails" label="Full explanation" rows={5} required />
    </ApiForm>
  )
}

function DecisionForm({ bout, onDone }: { bout?: Bout; onDone: () => void }) {
  const fighters = [
    bout?.redFighterId && { value: bout.redFighterId, label: `Red: ${bout.redFighter}` },
    bout?.blueFighterId && { value: bout.blueFighterId, label: `Blue: ${bout.blueFighter}` },
  ].filter(Boolean) as { value: string; label: string }[]
  return (
    <ApiForm
      submitLabel="Record decision"
      onSubmit={async (form) => {
        if (!bout) throw new Error('Bout not found.')
        await api(`/bouts/${bout.boutId}/decision`, {
          method: 'POST',
          body: JSON.stringify({
            winnerFighterId: form.get('winnerFighterId') || null,
            decision: form.get('decision'),
            decisionNotes: form.get('decisionNotes') || undefined,
          }),
        })
        onDone()
      }}
    >
      <SelectField name="winnerFighterId" label="Winner" emptyLabel="Draw / no winner" options={fighters} />
      <SelectField name="decision" label="Decision" options={['Unanimous decision', 'Split decision', 'Majority decision', 'TKO', 'KO', 'Draw', 'No contest']} />
      <TextAreaField name="decisionNotes" label="Decision notes" rows={4} />
    </ApiForm>
  )
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary)
}

function Field({
  name,
  label,
  ...props
}: {
  name: string
  label: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} {...props} />
    </div>
  )
}

function TextAreaField({
  name,
  label,
  ...props
}: {
  name: string
  label: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} {...props} />
    </div>
  )
}

function SelectField({
  name,
  label,
  options,
  emptyLabel,
  required,
}: {
  name: string
  label: string
  options: (string | { value: string; label: string })[]
  emptyLabel?: string
  required?: boolean
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} required={required}>
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((option) => {
          const value = typeof option === 'string' ? option : option.value
          const text = typeof option === 'string' ? titleCase(option) : option.label
          return <option key={value} value={value}>{text}</option>
        })}
      </select>
    </div>
  )
}

function Toolbar({ placeholder, action, onAction }: { placeholder: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue" placeholder={placeholder} />
      </div>
      {action && <button className="button button-dark" onClick={onAction}><Plus size={16} /> {action}</button>}
    </div>
  )
}

function EventToolbar({
  events,
  value,
  onChange,
  action,
  onAction,
}: {
  events: EventItem[]
  value?: string
  onChange: (value: string) => void
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="panel flex flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center">
      <div className="relative">
        <select
          className="min-w-72 appearance-none rounded-lg border-0 bg-slate-50 py-2.5 pl-3 pr-9 text-xs font-semibold outline-none"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {!events.length && <option value="">No events available</option>}
          {events.map((event) => <option key={event.eventId} value={event.eventId}>{event.name}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
      </div>
      {action && <button className="button button-dark" onClick={onAction} disabled={!value}><Plus size={16} /> {action}</button>}
    </div>
  )
}

function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2 className="text-xs font-bold">{title}</h2>
      {action && <button onClick={onAction} className="text-[11px] font-semibold text-blue">{action}</button>}
    </div>
  )
}

function Corner({ color, name, meta }: { color: 'red' | 'blue'; name?: string; meta?: string }) {
  return (
    <div className={`flex items-center gap-4 p-5 ${color === 'red' ? 'corner-red' : 'corner-blue'}`}>
      <Avatar name={name ?? 'TBC'} tone={color} />
      <div>
        <p className={`eyebrow ${color === 'red' ? 'text-red' : 'text-blue'}`}>{color} corner</p>
        <h3 className="heading mt-1 text-2xl">{name || 'To be confirmed'}</h3>
        {meta && <p className="mt-1 text-[11px] text-muted">{meta}</p>}
      </div>
    </div>
  )
}

function Avatar({ name, tone = 'ink' }: { name: string; tone?: 'ink' | 'red' | 'blue' }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const color = tone === 'red' ? 'bg-red/10 text-red' : tone === 'blue' ? 'bg-blue/10 text-blue' : 'bg-slate-100 text-ink'
  return <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${color}`}>{initials}</div>
}

function DateTile({ value }: { value: string }) {
  const date = new Date(value)
  return (
    <div className="rounded-lg bg-slate-100 p-2 text-center">
      <div className="eyebrow text-[9px] text-red">{date.toLocaleDateString('en-GB', { month: 'short' })}</div>
      <div className="heading mt-1 text-xl">{date.getDate()}</div>
    </div>
  )
}

function Status({ value }: { value: string }) {
  const tone =
    ['completed', 'accepted', 'verified', 'submitted'].includes(value) ? 'green' :
    ['published', 'confirmed', 'live', 'matched'].includes(value) ? 'blue' :
    ['cancelled', 'withdrawn', 'rejected'].includes(value) ? 'red' :
    ['draft', 'proposed'].includes(value) ? 'grey' : 'amber'
  return <span className={`status status-${tone}`}>{titleCase(value)}</span>
}

function Empty({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? '!min-h-44' : 'panel'}`}>
      <div>
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-muted"><ShieldAlert size={19} /></div>
        <h3 className="heading mt-4 text-xl">{title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted">{body}</p>
      </div>
    </div>
  )
}

function LoadError({ message, reload, compact = false }: { message?: string; reload: () => void; compact?: boolean }) {
  return (
    <div className={`empty-state panel ${compact ? '!min-h-44 !border-0 !shadow-none' : ''}`}>
      <div>
        <ShieldAlert className="mx-auto text-red" />
        <p className="mt-3 text-sm font-semibold">Could not load this view</p>
        <p className="mt-2 text-xs text-muted">{message ?? 'Check the local API and database connection.'}</p>
        <button className="button button-subtle mt-4" onClick={reload}><RefreshCw size={15} /> Try again</button>
      </div>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton h-32" />)}
    </div>
  )
}

function PanelLoading() {
  return <div className="grid gap-3 p-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="skeleton h-14" />)}</div>
}
