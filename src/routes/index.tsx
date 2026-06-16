import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  Dumbbell,
  FileCheck2,
  Scale,
  ShieldCheck,
  Swords,
  Users,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const features = [
  {
    icon: CalendarDays,
    title: 'Build every kind of event',
    body: 'Interclubs, seminars, fight nights and competitions, with key dates, venues, media and invitations.',
  },
  {
    icon: Users,
    title: 'Invite gyms, receive rosters',
    body: 'Tell coaches exactly what you are looking for, then review submitted fighters in one structured roster.',
  },
  {
    icon: Swords,
    title: 'Match with confidence',
    body: 'Compare weight, experience, class, stance and records before placing red and blue corners.',
  },
  {
    icon: Scale,
    title: 'Prove the weigh-in',
    body: 'Capture official weights, evidence and verification status against the right event and bout.',
  },
  {
    icon: FileCheck2,
    title: 'Keep declarations together',
    body: 'Waivers, medical declarations, guardian consent and scorecards stay attached to the record.',
  },
  {
    icon: ShieldCheck,
    title: 'Know what changed',
    body: 'Withdrawals require a reason, promoters are notified, and every important action is audited.',
  },
]

const roles = [
  ['PROMOTER', 'Build events, invite gyms, match fighters and publish the card.'],
  ['COACH', 'Manage the gym, submit rosters and keep every fighter ready.'],
  ['FIGHTER', 'Maintain your profile, evidence and event declarations.'],
  ['OFFICIAL', 'See assignments, submit scorecards and verify results.'],
  ['PARENT', 'Manage consent and records for junior fighters.'],
]

function HomePage() {
  return (
    <div>
      <section className="hero">
        <img
          src="/assets/compete-hero.png"
          alt="Red and blue corner fighters preparing for a Muay Thai bout"
          className="hero-image"
        />
        <div className="hero-overlay" />
        <div className="site-width relative z-10 flex min-h-[720px] items-center py-24">
          <div className="max-w-2xl">
            <div className="eyebrow mb-5 text-gold">Combat sports operations</div>
            <h1 className="display text-white">
              ONE PLATFORM.
              <br />
              <span className="text-gold">EVERY CORNER.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/72">
              From the first gym invitation to the final scorecard, COMPETE keeps
              promoters, coaches, fighters and officials on the same fight plan.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register" className="button button-primary">
                Start building your card <ArrowRight size={18} />
              </Link>
              <a href="#platform" className="button button-ghost">
                Explore the platform
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/62">
              {['OTP sign-in', 'SQL-backed records', 'Role-aware access'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <BadgeCheck size={17} className="text-gold" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gold py-7">
        <div className="site-width grid grid-cols-2 gap-5 text-center md:grid-cols-4">
          {[
            ['EVENTS', 'One source of truth'],
            ['ROSTERS', 'Coach controlled'],
            ['BOUTS', 'Red and blue corners'],
            ['RECORDS', 'Evidence attached'],
          ].map(([title, body]) => (
            <div key={title} className="border-ink/14 px-4 md:border-r md:last:border-0">
              <div className="heading text-xl text-ink">{title}</div>
              <div className="mt-1 text-xs font-medium text-ink/62">{body}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="platform" className="section bg-paper">
        <div className="site-width">
          <div className="max-w-2xl">
            <p className="eyebrow text-red">One connected platform</p>
            <h2 className="section-title mt-3">RUN THE EVENT.<br />PROTECT THE RECORD.</h2>
            <p className="mt-5 text-base leading-7 text-muted">
              COMPETE replaces message threads, shared spreadsheets and loose files
              with a clear workflow built around the people doing the work.
            </p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }, index) => (
              <article key={title} className="bg-white p-7 lg:p-8">
                <div className="flex items-start justify-between">
                  <span className={index % 2 ? 'icon-box icon-blue' : 'icon-box icon-red'}>
                    <Icon size={22} />
                  </span>
                  <span className="heading text-sm text-ink/20">0{index + 1}</span>
                </div>
                <h3 className="heading mt-7 text-2xl text-ink">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="section bg-ink text-white">
        <div className="site-width grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow text-gold">A cleaner route to fight night</p>
            <h2 className="section-title mt-3 text-white">FROM INVITE<br />TO DECISION.</h2>
            <p className="mt-5 max-w-md leading-7 text-white/60">
              Each step unlocks the next, while the right people always retain control
              of their fighters and information.
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ['01', 'Promoter creates an event', 'Dates, venue, format, deadlines and fighter criteria.'],
              ['02', 'Gyms submit a roster', 'Coaches decide who is available and provide current details.'],
              ['03', 'Promoter builds the card', 'Matched fighters become confirmed red and blue corners.'],
              ['04', 'Everyone completes fight-day records', 'Weigh-ins, waivers, results, scorecards and media.'],
            ].map(([number, title, body]) => (
              <div key={number} className="workflow-row">
                <span className="heading text-2xl text-gold">{number}</span>
                <div>
                  <h3 className="heading text-xl">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-white/55">{body}</p>
                </div>
                <ArrowRight className="ml-auto hidden text-white/20 sm:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="section bg-white">
        <div className="site-width">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow text-blue">Built around real responsibilities</p>
              <h2 className="section-title mt-3">YOUR VIEW.<br />YOUR NEXT MOVE.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">
              One account can hold the roles a person actually has. A coach can also
              be a fighter. A parent can manage a junior. Access follows responsibility.
            </p>
          </div>
          <div className="mt-12 grid gap-3">
            {roles.map(([title, body], index) => (
              <article key={title} className="role-row">
                <span className={`h-2.5 w-2.5 rounded-full ${index % 2 ? 'bg-blue' : 'bg-red'}`} />
                <h3 className="heading w-32 text-xl text-ink">{title}</h3>
                <p className="text-sm text-muted">{body}</p>
                <ClipboardCheck className="ml-auto hidden text-ink/20 md:block" size={20} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="site-width">
          <div className="cta-panel">
            <Dumbbell className="text-gold" size={34} />
            <div>
              <p className="eyebrow text-gold">Ready when the card is</p>
              <h2 className="heading mt-2 text-4xl text-white md:text-5xl">
                PUT THE WHOLE EVENT IN ONE PLACE.
              </h2>
            </div>
            <Link to="/register" className="button button-primary lg:ml-auto">
              Create your account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
