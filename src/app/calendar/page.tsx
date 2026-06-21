import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TopNav } from "@/app/nav";
import { listCalendarProjects } from "@/server/calendar";
import { CalendarApp } from "./calendar-app";

export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) notFound();

  const projects = await listCalendarProjects(userId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopNav active="calendar" />
      <div className="min-h-0 flex-1">
        <CalendarApp projects={projects} />
      </div>
    </div>
  );
}
