import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/client";
import {
  LayoutDashboard, Users, KanbanSquare, FileText,
  CheckSquare, Shield, BarChart3, ChevronLeft, ChevronRight,
  LogOut, Bell, Search, Menu, X, UserCog, AlertCircle, CalendarClock, ClipboardList, ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PendingApproval from "@/components/auth/PendingApproval";

const BROKER_NAV = [
  { name: "Dashboard",  icon: LayoutDashboard, page: "Dashboard" },
  { name: "Clients",    icon: Users,            page: "Clients" },
  { name: "Pipeline",   icon: KanbanSquare,     page: "Pipeline" },
  { name: "Policies",   icon: Shield,           page: "Policies" },
  { name: "Renewals",   icon: CalendarClock,    page: "Renewals" },
  { name: "Tasks",      icon: CheckSquare,      page: "Tasks" },
  { name: "Documents",  icon: FileText,         page: "Documents" },
  { name: "Reports",    icon: BarChart3,         page: "Reports" },
  { name: "ROA",        icon: ClipboardList,     page: "ROA" },
];

const ADMIN_STAFF_NAV = [
  { name: "Dashboard",  icon: LayoutDashboard, page: "Dashboard" },
  { name: "Clients",    icon: Users,            page: "Clients" },
  { name: "Policies",   icon: Shield,           page: "Policies" },
  { name: "Documents",  icon: FileText,         page: "Documents" },
];

const ADMIN_EXTRA = { name: "Users", icon: UserCog, page: "UserManagement" };
const ADMIN_AUDIT = { name: "Audit Logs", icon: ScrollText, page: "AuditLogs" };

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  // Auto-set status for new users: admins get approved, others get pending
  useEffect(() => {
    if (!user) return;
    if (!user.status) {
      const initialStatus = user.role === "admin" ? "approved" : "pending";
      base44.auth.updateMe({ status: initialStatus });
    } else if (user.role === "admin" && user.status !== "approved") {
      base44.auth.updateMe({ status: "approved" });
    }
  }, [user]);

  const handleLogout = () => base44.auth.logout();

  // ── Access gate ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#1a2744] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show pending / rejected screen for non-admins that haven't been approved
  if (user && user.role !== "admin" && user.status !== "approved") {
    return <PendingApproval status={user.status} user={user} onLogout={handleLogout} />;
  }

  const isAdmin = user?.role === "admin";
  const isAdminStaff = user?.role === "admin_staff";

  const navItems = isAdmin
    ? [...BROKER_NAV, ADMIN_EXTRA, ADMIN_AUDIT]
    : isAdminStaff
    ? ADMIN_STAFF_NAV
    : BROKER_NAV;

  return (
    <div className="flex h-screen bg-[#f8f9fb] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-50 h-full bg-[#1a2744] text-white flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? "lg:w-[72px]" : "lg:w-[250px]"}
        ${mobileOpen ? "w-[250px] translate-x-0" : "w-[250px] -translate-x-full lg:translate-x-0"}`}>

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[#1a2744] font-bold text-sm">HRS</span>
              </div>
              <div>
                <div className="font-semibold text-sm leading-tight">HRS Insurance</div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">CRM</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto">
              <span className="text-[#1a2744] font-bold text-xs">H</span>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                  ${isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/8"
                  }`}
              >
                <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-orange-400" : ""}`} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          {user && !collapsed && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-semibold">
                {user.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.full_name || "User"}</div>
                <div className="text-[10px] text-white/40 capitalize">{user.role || "broker"}</div>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <LogOut className="w-[18px] h-[18px]" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all mt-1">
            {collapsed ? <ChevronRight className="w-[18px] h-[18px]" /> : <ChevronLeft className="w-[18px] h-[18px]" />}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-[#1a2744]">{currentPageName || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}