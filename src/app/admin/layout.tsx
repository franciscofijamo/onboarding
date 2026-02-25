import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { isAdmin } from "@/lib/admin-utils"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminChrome } from "@/components/admin/admin-chrome"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminDevModeProvider } from "@/contexts/admin-dev-mode"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (process.env.E2E_AUTH_BYPASS !== '1') {
    const { userId } = await auth()
    if (!userId || !(await isAdmin(userId))) {
      redirect("/dashboard")
    }
  }

  return (
    <AdminDevModeProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <AdminChrome>{children}</AdminChrome>
        </SidebarInset>
      </SidebarProvider>
    </AdminDevModeProvider>
  )
}
