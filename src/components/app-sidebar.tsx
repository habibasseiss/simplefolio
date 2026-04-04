"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  CircleHelpIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  Settings2Icon,
  TrendingUpIcon,
  UploadIcon,
  WalletIcon,
} from "lucide-react"

const data = {
  user: {
    name: "Default User",
    email: "user@simplefolio.app",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Accounts",
      url: "/accounts",
      icon: <WalletIcon />,
    },
    {
      title: "Holdings",
      url: "/holdings",
      icon: <LineChartIcon />,
    },
    {
      title: "Portfolio",
      url: "/portfolio",
      icon: <TrendingUpIcon />,
    },
  ],
  navSecondary: [
    {
      title: "Batch Import",
      url: "/import",
      icon: <UploadIcon />,
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/dashboard">
                <TrendingUpIcon className="size-5!" />
                <span className="text-base font-semibold">Simplefolio</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
