// Curated business-English speaking prompts, grouped so the user always has
// something to talk about. The AI can also generate fresh ones (see openai.ts).

export interface TopicGroup {
  label: string;
  topics: string[];
}

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    label: 'Meetings & updates',
    topics: [
      'Give a two-minute status update on a project that is slightly behind schedule.',
      'Open a team meeting and set the agenda for the next 30 minutes.',
      'Summarise the key decisions and action points from a meeting that just ended.',
      'Disagree politely with a colleague’s proposal and suggest an alternative.',
    ],
  },
  {
    label: 'Negotiation & persuasion',
    topics: [
      'Persuade a client to extend a deadline by two weeks without losing their trust.',
      'Negotiate the price of a supplier contract while keeping the relationship strong.',
      'Pitch a new idea to senior management and pre-empt their objections.',
      'Push back on an unreasonable request from your manager, diplomatically.',
    ],
  },
  {
    label: 'Difficult conversations',
    topics: [
      'Give constructive feedback to a team member whose work has slipped.',
      'Apologise to a customer for a service failure and explain the next steps.',
      'Tell a stakeholder that their requested feature will not make this release.',
      'Decline a meeting invitation politely and propose an alternative.',
    ],
  },
  {
    label: 'Presentations & storytelling',
    topics: [
      'Present last quarter’s results and explain one number that surprised you.',
      'Introduce yourself and your role to a new cross-functional team.',
      'Explain a technical concept to a non-technical executive in plain terms.',
      'Tell the story of a project that failed and what you learned from it.',
    ],
  },
  {
    label: 'Networking & small talk',
    topics: [
      'Make small talk with a senior colleague while waiting for a meeting to start.',
      'Describe what your company does to someone you just met at a conference.',
      'Catch up with a former colleague and gently explore a job opportunity.',
    ],
  },
];

export const ALL_TOPICS = TOPIC_GROUPS.flatMap((g) => g.topics);

export function randomTopic(): string {
  return ALL_TOPICS[Math.floor(Math.random() * ALL_TOPICS.length)];
}
