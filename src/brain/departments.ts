import { domain } from '../theme/tokens'

/**
 * The venue brain's people. Ported from peregrine_venue_brain_v2.html.
 *
 * Every department carries a Checker — an agent whose whole job is to verify
 * the others' work before it reaches the owner. That role is the reason the
 * owner can approve a thing in one tap instead of auditing it.
 */

export type AgentState = 'ok' | 'attention'

export type AgentAction = {
  /** Small label above the buttons — "I can fix this", "Your call". */
  label: string
  /** The affirmative button. */
  primary: string
  /** The decline button. Never destructive, never a dead end. */
  ghost: string
  /** What replaces the buttons once either is pressed. */
  done: string
}

export type Agent = {
  name: string
  job: string
  status: AgentState
  /** Body copy. `[[…]]` marks a figure to be set in the mono face. */
  line: string
  action: AgentAction
}

export type Department = {
  id: string
  name: string
  /** Domain tint from the shared tokens, not a loose hex. */
  color: string
  people: Agent[]
}

/**
 * NOTE — copy for review.
 *
 * The brief is that every agent reply ends in an approvable action, two
 * buttons, never just information. Six agents in the original had
 * `action: null` — the four Checkers plus Sarah and Angela — so their
 * replies ended flat. Actions have been written for them here to satisfy
 * the rule. The wording is a first pass and wants Thomas's eye; the
 * pre-existing six are untouched.
 */
export const DEPARTMENTS: Department[] = [
  {
    id: 'finance',
    name: 'Finance department',
    color: domain.finance,
    people: [
      {
        name: 'Sarah',
        job: 'Bookkeeping (Xero)',
        status: 'ok',
        line: 'Today you took [[$1,840]] across 96 covers — up [[8%]] on last Tuesday. Books are reconciled to the cent.',
        action: {
          label: 'Nothing needs fixing',
          primary: 'Send me a weekly summary',
          ghost: 'Only when something changes',
          done: "Set — you'll get it Monday mornings.",
        },
      },
      {
        name: 'Brett',
        job: 'Till (Square)',
        status: 'attention',
        line: "Heads up — a [[$39/mo]] card-fee subscription overlaps with your Square plan. You're paying twice for the same thing.",
        action: {
          label: 'I can fix this',
          primary: 'Cancel the duplicate',
          ghost: 'Leave it',
          done: "Cancelled — I'll confirm the refund.",
        },
      },
      {
        name: 'Angela',
        job: 'Tax & BAS',
        status: 'ok',
        line: "Your next BAS is due in [[18 days]]. I've set aside the GST already — you're covered, nothing to do yet.",
        action: {
          label: 'Ahead of time',
          primary: 'Remind me on the 21st',
          ghost: "I'll keep an eye on it",
          done: "Reminder set for the 21st.",
        },
      },
      {
        name: 'Isabella',
        job: 'Checker',
        status: 'ok',
        line: "I check the team's work before it reaches you. Today: revenue matches the POS ✓, GST set aside ✓. One item — Brett's duplicate charge — I've flagged for your OK.",
        action: {
          label: 'My working',
          primary: 'Show me what you checked',
          ghost: 'Just the flags from now on',
          done: 'Noted — flags only.',
        },
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing department',
    color: domain.marketing,
    people: [
      {
        name: 'Mia',
        job: 'Social & content',
        status: 'ok',
        line: 'Tuesdays are quiet. I’ve drafted a "bring-your-own-cup, $4 flat white, 11–2" post — values, not a discount, aimed at your after-2pm office crowd.',
        action: {
          label: 'Ready to go',
          primary: 'Schedule Monday 8am',
          ghost: 'Show the draft',
          done: 'Scheduled. Reach reported Tuesday.',
        },
      },
      {
        name: 'Noah',
        job: 'Reviews & reputation',
        status: 'ok',
        line: "You're on [[41]] Google reviews at 4.5★; nearby venues sit at 120+. I can text a review link to 60 regulars who came in this week.",
        action: {
          label: 'With your OK',
          primary: 'Send the 60 requests',
          ghost: 'Not yet',
          done: "Sending — they'll appear on your brain.",
        },
      },
      {
        name: 'Grace',
        job: 'Checker',
        status: 'ok',
        line: "I make sure nothing goes out in the wrong tone or to the wrong list. Mia's post and Noah's review texts both look on-brand — waiting on your approval.",
        action: {
          label: 'Before anything sends',
          primary: 'Hold anything off-brand',
          ghost: 'Send and tell me after',
          done: "I'll hold anything that reads wrong.",
        },
      },
    ],
  },
  {
    id: 'suppliers',
    name: 'Suppliers & stock',
    color: domain.suppliers,
    people: [
      {
        name: 'Leo',
        job: 'Ordering',
        status: 'attention',
        line: 'Oat milk runs out Thursday at current pace. Your usual supplier is [[9%]] dearer this month; a verified alternative is [[$0.40/L]] cheaper, same brand.',
        action: {
          label: 'Your call',
          primary: 'Order the cheaper one',
          ghost: 'Stick with usual',
          done: 'Ordered — arrives Wednesday.',
        },
      },
      {
        name: 'Priya',
        job: 'Price watch',
        status: 'ok',
        line: "I watch every invoice for quiet price creep. This week: coffee beans steady, but pastries lifted [[12%]] — that's [[$0.38]]/unit off your margin.",
        action: {
          label: 'Options',
          primary: 'Draft a note to the supplier',
          ghost: 'Find alternatives',
          done: 'Drafted — in your outbox.',
        },
      },
      {
        name: 'Hugo',
        job: 'Checker',
        status: 'ok',
        line: "I verify a switch is real before you act on it. Leo's cheaper oat-milk supplier checks out — verified ABN, same product. Safe to approve.",
        action: {
          label: 'How far I check',
          primary: 'Always verify the ABN',
          ghost: 'Price alone is enough',
          done: "I'll keep verifying every switch.",
        },
      },
    ],
  },
  {
    id: 'roster',
    name: 'Roster department',
    color: domain.roster,
    people: [
      {
        name: 'Maya',
        job: 'Scheduling',
        status: 'ok',
        line: "Next week's roster is built from everyone's availability and skills. Saturday's busy (market day) so I've added Sam 9–1. Nobody loses shifts they wanted.",
        action: {
          label: 'Needs your approval',
          primary: 'Approve the roster',
          ghost: 'Let me adjust',
          done: 'Sent to the team.',
        },
      },
      {
        name: 'Tom',
        job: 'Checker',
        status: 'ok',
        line: 'I check the roster stays within your labour budget and award rules before it goes out. This one’s within budget and compliant — ready for your sign-off.',
        action: {
          label: 'If it ever breaches',
          primary: 'Block it and tell me',
          ghost: 'Send it, flag it after',
          done: "I'll block anything over budget.",
        },
      },
    ],
  },
]

/** A department needs attention if any of its people do. */
export const needsAttention = (d: Department) => d.people.some((p) => p.status === 'attention')

/** Total outstanding items across every department — drives the header count. */
export const attentionCount = (depts: Department[]) =>
  depts.reduce((n, d) => n + d.people.filter((p) => p.status === 'attention').length, 0)

export function greetingWord(now = new Date()): string {
  const h = now.getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}
