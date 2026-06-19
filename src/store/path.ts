import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LessonSpec } from '@/api/openai';
import type { MistakeCategory } from '@/types';

const KEY = 'path_v1';

export type PathNodeKind = 'topic' | 'recording';

/**
 * One step in the single learning path. Either a `topic` lesson (theory +
 * practice on an area like articles) or a `recording` node (review & drill the
 * mistakes from one recording). Both open a chat at /practice/<id>; a recording
 * node's id IS its session id.
 */
export interface PathNode {
  id: string;
  kind: PathNodeKind;
  title: string;
  summary: string;
  category: MistakeCategory;
  area?: string;
  basedOnTypes?: string[];
  sessionId?: string;
  status: 'available' | 'completed';
  createdAt: number;
}

interface PathState {
  nodes: PathNode[];
  loaded: boolean;
  load: () => Promise<void>;
  /** Add a node for a just-analysed recording (idempotent by session id). */
  addRecording: (sessionId: string, topic: string, createdAt: number) => void;
  /** Append new topic lessons, skipping any already in the path. Returns #added. */
  addTopics: (specs: LessonSpec[], createdAt: number) => number;
  markComplete: (id: string) => void;
  removeBySession: (sessionId: string) => void;
  clear: () => void;
}

function persist(nodes: PathNode[]) {
  AsyncStorage.setItem(KEY, JSON.stringify(nodes)).catch(() => {});
}

function topicId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `topic_${slug || 'lesson'}`;
}

export const usePath = create<PathState>((set, get) => ({
  nodes: [],
  loaded: false,

  load: async () => {
    let nodes: PathNode[] = [];
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) nodes = JSON.parse(raw);
    } catch {
      nodes = [];
    }
    set({ nodes, loaded: true });
  },

  addRecording: (sessionId, topic, createdAt) => {
    if (get().nodes.some((n) => n.id === sessionId)) return;
    const node: PathNode = {
      id: sessionId,
      kind: 'recording',
      title: topic,
      summary: 'See your mistakes from this recording and practise them.',
      category: 'grammar',
      sessionId,
      status: 'available',
      createdAt,
    };
    const nodes = [...get().nodes, node];
    set({ nodes });
    persist(nodes);
  },

  addTopics: (specs, createdAt) => {
    const existing = new Set(get().nodes.map((n) => n.id));
    const additions: PathNode[] = [];
    for (const spec of specs) {
      const id = topicId(spec.title);
      if (existing.has(id)) continue;
      existing.add(id);
      additions.push({
        id,
        kind: 'topic',
        title: spec.title,
        summary: spec.summary,
        category: spec.category,
        area: spec.area,
        basedOnTypes: spec.basedOnTypes,
        status: 'available',
        createdAt,
      });
    }
    if (additions.length === 0) return 0;
    const nodes = [...get().nodes, ...additions];
    set({ nodes });
    persist(nodes);
    return additions.length;
  },

  markComplete: (id) => {
    const nodes = get().nodes.map((n) =>
      n.id === id && n.status !== 'completed' ? { ...n, status: 'completed' as const } : n,
    );
    set({ nodes });
    persist(nodes);
  },

  removeBySession: (sessionId) => {
    const nodes = get().nodes.filter((n) => n.sessionId !== sessionId);
    set({ nodes });
    persist(nodes);
  },

  clear: () => {
    set({ nodes: [] });
    persist([]);
  },
}));
