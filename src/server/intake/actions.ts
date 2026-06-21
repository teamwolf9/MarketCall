"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { projectRole, roleAtLeast } from "@/server/auth/access";
import { INTAKE_FIELD_IDS } from "./questions";
import { getIntakeAnswers, saveIntakeAnswers } from "./intake";

/** Save the brief. Editor+ on the project. Merges onto existing answers. */
export async function saveIntake(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;

  const role = await projectRole(userId, projectId);
  if (!roleAtLeast(role, "editor")) return;

  // Merge over existing so saving doesn't clear fields not in this submission.
  const answers = { ...(await getIntakeAnswers(projectId)) };
  for (const id of INTAKE_FIELD_IDS) {
    if (formData.has(id)) answers[id] = String(formData.get(id) ?? "").trim();
  }
  await saveIntakeAnswers(projectId, answers);

  revalidatePath(`/projects/${projectId}/brief`);
  revalidatePath(`/projects/${projectId}`);
}

/** Save a single field (used by the guided walkthrough). Editor+. */
export async function saveBriefField(
  projectId: string,
  fieldId: string,
  value: string,
): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  if (!INTAKE_FIELD_IDS.includes(fieldId)) return false;

  const role = await projectRole(userId, projectId);
  if (!roleAtLeast(role, "editor")) return false;

  const answers = { ...(await getIntakeAnswers(projectId)) };
  answers[fieldId] = value.trim();
  await saveIntakeAnswers(projectId, answers);

  revalidatePath(`/projects/${projectId}/brief`);
  revalidatePath(`/projects/${projectId}`);
  return true;
}
