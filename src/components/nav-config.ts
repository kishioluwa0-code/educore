import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileBadge,
  ScanLine,
  Wallet,
  MessageSquare,
  Boxes,
  BarChart3,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/role-context";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: number;
  children?: { label: string; to: string; badge?: number; roles?: UserRole[] }[];
  roles?: UserRole[];
};

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    group: "School",
    items: [
      {
        label: "People",
        to: "/people",
        icon: Users,
        roles: ["administrator", "principal", "hr", "teacher", "parent"],
        children: [
          {
            label: "Students",
            to: "/people/students",
            roles: ["administrator", "principal", "teacher", "parent", "student"],
          },
          {
            label: "Parents & Guardians",
            to: "/people",
            roles: ["administrator", "principal", "teacher", "hr", "parent"],
          },
          { label: "Staff", to: "/people", roles: ["administrator", "principal", "hr"] },
          {
            label: "Non-teaching staff",
            to: "/people",
            roles: ["administrator", "principal", "hr"],
          },
        ],
      },
      {
        label: "Students",
        to: "/people/students",
        icon: GraduationCap,
        badge: 12,
        roles: ["administrator", "principal", "teacher", "parent", "student"],
        children: [
          { label: "All students", to: "/people/students" },
          {
            label: "Admissions",
            to: "/people/students/new",
            roles: ["administrator", "principal", "hr"],
          },
          {
            label: "Identity cards",
            to: "/people/students/ids",
            roles: ["administrator", "principal", "hr"],
          },
          {
            label: "Promotion & movement",
            to: "/people/students",
            roles: ["administrator", "principal", "teacher"],
          },
        ],
      },
      {
        label: "Academics",
        to: "/academics",
        icon: BookOpen,
        roles: ["administrator", "principal", "teacher", "examinations", "student"],
      },
      {
        label: "Assessment",
        to: "/assessment",
        icon: ClipboardCheck,
        badge: 7,
        roles: ["administrator", "principal", "teacher", "examinations", "student", "parent"],
      },
      {
        label: "Examinations",
        to: "/examinations",
        icon: FileBadge,
        roles: ["administrator", "principal", "teacher", "examinations", "student", "parent"],
      },
      {
        label: "Attendance & Access",
        to: "/attendance",
        icon: ScanLine,
        badge: 18,
        roles: ["administrator", "principal", "teacher", "hr", "security", "parent", "student"],
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Finance",
        to: "/finance",
        icon: Wallet,
        badge: 3,
        roles: ["administrator", "principal", "bursar", "parent", "student"],
        children: [
          {
            label: "Overview",
            to: "/finance",
            roles: ["administrator", "principal", "bursar", "parent", "student"],
          },
          {
            label: "Fee structures",
            to: "/finance/fees",
            roles: ["administrator", "principal", "bursar"],
          },
          {
            label: "Invoices",
            to: "/finance/invoices",
            roles: ["administrator", "principal", "bursar", "parent", "student"],
          },
          {
            label: "Payments",
            to: "/finance/payments",
            roles: ["administrator", "principal", "bursar"],
          },
          {
            label: "Receipts",
            to: "/finance/receipts",
            roles: ["administrator", "principal", "bursar", "parent", "student"],
          },
        ],
      },
      {
        label: "Communication",
        to: "/communication",
        icon: MessageSquare,
        roles: ["administrator", "principal", "teacher", "hr", "security", "parent", "student"],
      },
      {
        label: "Operations",
        to: "/operations",
        icon: Boxes,
        roles: ["administrator", "principal", "hr", "security"],
      },
      {
        label: "Reports & Analytics",
        to: "/reports",
        icon: BarChart3,
        roles: ["administrator", "principal", "bursar", "examinations", "hr"],
      },
    ],
  },
  {
    group: "Administration",
    items: [
      { label: "Superadmin", to: "/superadmin", icon: ShieldCheck, roles: ["superadmin"] },
      {
        label: "Security",
        to: "/security",
        icon: ShieldCheck,
        roles: ["administrator", "principal", "security"],
      },
      { label: "Settings", to: "/settings", icon: Settings, roles: ["administrator"] },
    ],
  },
];
