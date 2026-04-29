import * as React from "react";
import { HugeiconsIcon, type HugeiconsIconProps, type IconSvgElement } from "@hugeicons/react";
import {
  AlertCircleIcon,
  AmbulanceIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  BarChartIcon,
  BirthdayCakeIcon,
  BookOpen02Icon,
  Calendar01Icon,
  Calendar03Icon,
  CalendarLove01Icon,
  Cancel01Icon,
  CheckListIcon,
  CheckmarkCircle03Icon,
  Delete02Icon,
  FolderOpenIcon,
  GraduationScrollIcon,
  InboxIcon,
  LegalDocument01Icon,
  Loading01Icon,
  MinusSignIcon,
  MonitorDotIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PencilIcon,
  Search02Icon,
  Settings05Icon,
  Shield01Icon,
  ShieldQuestionMarkIcon,
  ShieldUserIcon,
  SchoolIcon,
  SquareIcon,
  StethoscopeIcon,
  StarIcon,
  Sun01Icon,
  Moon01Icon,
  Tick02Icon,
  UserIcon,
  UserMultipleIcon,
  CalendarRemove01Icon as CalendarRemoveIcon,
  Calendar03Icon as CalendarRangeIcon,
} from "@hugeicons/core-free-icons";

type LucideIconProps = Omit<HugeiconsIconProps, "icon" | "altIcon">;

function createIcon(icon: IconSvgElement, displayName: string) {
  const Component = React.forwardRef<SVGSVGElement, LucideIconProps>(
    function LucideCompatIcon({ strokeWidth = 2, ...props }, ref) {
      return <HugeiconsIcon ref={ref} icon={icon} strokeWidth={strokeWidth} {...props} />;
    },
  );

  Component.displayName = displayName;
  return Component;
}

export const AlertCircle = createIcon(AlertCircleIcon, "AlertCircle");
export const Ambulance = createIcon(AmbulanceIcon, "Ambulance");
export const ArrowLeftRight = createIcon(ArrowLeftRightIcon, "ArrowLeftRight");
export const ArrowRight = createIcon(ArrowRight01Icon, "ArrowRight");
export const BarChart2 = createIcon(BarChartIcon, "BarChart2");
export const BookOpen = createIcon(BookOpen02Icon, "BookOpen");
export const Cake = createIcon(BirthdayCakeIcon, "Cake");
export const CalendarDays = createIcon(Calendar03Icon, "CalendarDays");
export const CalendarHeart = createIcon(CalendarLove01Icon, "CalendarHeart");
export const CalendarIcon = createIcon(Calendar01Icon, "CalendarIcon");
export const CalendarX = createIcon(CalendarRemoveIcon, "CalendarX");
export const CalendarRange = createIcon(CalendarRangeIcon, "CalendarRange");
export const ChevronDown = createIcon(ArrowDown01Icon, "ChevronDown");
export const ChevronLeft = createIcon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = createIcon(ArrowRight01Icon, "ChevronRight");
export const Check = createIcon(Tick02Icon, "Check");
export const CheckCircle = createIcon(CheckmarkCircle03Icon, "CheckCircle");
export const ClipboardCheck = createIcon(CheckListIcon, "ClipboardCheck");
export const FileText = createIcon(LegalDocument01Icon, "FileText");
export const FolderOpen = createIcon(FolderOpenIcon, "FolderOpen");
export const GraduationCap = createIcon(GraduationScrollIcon, "GraduationCap");
export const Inbox = createIcon(InboxIcon, "Inbox");
export const LoaderCircle = createIcon(Loading01Icon, "LoaderCircle");
export const Minus = createIcon(MinusSignIcon, "Minus");
export const Monitor = createIcon(MonitorDotIcon, "Monitor");
export const MoreHorizontal = createIcon(MoreHorizontalIcon, "MoreHorizontal");
export const PanelLeftClose = createIcon(PanelLeftCloseIcon, "PanelLeftClose");
export const PanelLeftOpen = createIcon(PanelLeftOpenIcon, "PanelLeftOpen");
export const Pencil = createIcon(PencilIcon, "Pencil");
export const Search = createIcon(Search02Icon, "Search");
export const Settings = createIcon(Settings05Icon, "Settings");
export const Shield = createIcon(Shield01Icon, "Shield");
export const ShieldAlert = createIcon(ShieldQuestionMarkIcon, "ShieldAlert");
export const ShieldUser = createIcon(ShieldUserIcon, "ShieldUser");
export const School = createIcon(SchoolIcon, "School");
export const Square = createIcon(SquareIcon, "Square");
export const Stethoscope = createIcon(StethoscopeIcon, "Stethoscope");
export const Star = createIcon(StarIcon, "Star");
export const Sun = createIcon(Sun01Icon, "Sun");
export const Moon = createIcon(Moon01Icon, "Moon");
export const Trash2 = createIcon(Delete02Icon, "Trash2");
export const User = createIcon(UserIcon, "User");
export const Users = createIcon(UserMultipleIcon, "Users");
export const X = createIcon(Cancel01Icon, "X");
