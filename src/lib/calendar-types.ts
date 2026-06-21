/** Client-side shapes (events arrive as JSON, so times are ISO strings). */
export type CalProject = {
  id: string;
  name: string;
  brandName: string;
};

export type CalEvent = {
  id: string;
  projectId: string;
  title: string;
  notes: string | null;
  channel: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
};
