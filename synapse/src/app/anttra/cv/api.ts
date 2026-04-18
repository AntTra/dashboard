export interface GHUser {
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
}

export interface GHRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  html_url: string;
}

export interface GHEvent {
  type: string;
  repo: { name: string };
  payload: { commits?: { message: string }[]; ref?: string; action?: string };
  created_at: string;
}

const RELEVANT_EVENTS = ['PushEvent', 'CreateEvent', 'PullRequestEvent', 'IssuesEvent'];

export async function fetchGithubData(handle: string) {
  const base = `https://api.github.com/users/${handle}`;
  const [user, repos, events] = await Promise.all([
    fetch(base).then(r => r.json()),
    fetch(`${base}/repos?sort=updated&per_page=6`).then(r => r.json()),
    fetch(`${base}/events/public?per_page=12`).then(r => r.json()),
  ]);
  return {
    user:   (user?.avatar_url ? user : null) as GHUser | null,
    repos:  (Array.isArray(repos) ? repos : []) as GHRepo[],
    events: (Array.isArray(events)
      ? (events as GHEvent[]).filter(e => RELEVANT_EVENTS.includes(e.type)).slice(0, 8)
      : []) as GHEvent[],
  };
}
