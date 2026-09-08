import { redirect } from "next/navigation"

/**
 * Every framework now lives on the single stacked /plan page. This route is
 * kept so existing links land on the right section instead of a 404.
 */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ framework: string }>
}) {
  const { framework } = await params
  redirect(`/plan#${framework}`)
}
