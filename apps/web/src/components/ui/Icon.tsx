import type { ComponentProps } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  AlignLeft, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, AudioWaveform, Ban, Bell, Bold, BookOpen, Briefcase, Brush, Calendar, CalendarDays,
  ChartColumn, ChartPie, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, CircleCheck, CirclePlus, ClipboardList,
  Clock, CloudDownload, Code, Coins, Columns3, Compass, Copy, Crown, Database, Ellipsis, EllipsisVertical, Eraser, Eye, EyeOff, Feather, File, FileDown, FileText, FileUp,
  Filter, Fingerprint, Flag, Flame, Folder, FolderPlus, Footprints, GitBranch, Globe, GripVertical, Hand, Handshake, Hash, Heading, Heart,
  HeartPulse, History, House, Image, Inbox, Key, Keyboard, Layers, Link, List, ListChecks, Loader, Lock, LogIn, LogOut, Mail, MailCheck,
  MailOpen, MapPin, Maximize2, Megaphone, Menu, MessageCircle, MessageCircleMore, MessageSquare, MessagesSquare, Mic, Minimize2, Minus,
  Monitor, Moon, Network, Newspaper, Palette, Paperclip, Pause, Pen, PenTool, Pin, Play, Plug, PlugZap, Plus, Quote, RefreshCw, Reply, Rss,
  RotateCcw, RotateCw, Route, Search, Send, Settings, Share2, Shield, ShieldUser, SlidersHorizontal, Smartphone, Smile, SpellCheck, Sprout,
  Square, SquareArrowOutUpRight, Star, SquareCheck, SquarePen, StickyNote, Sun, Table, Tablet, Tag, Terminal, ToggleRight, Trash2, TriangleAlert,
  Unlink, User, UserLock, UserPlus, Users, Wallet, WandSparkles, Workflow, X, Zap, ZoomIn,
  type LucideIcon,
} from "lucide-react";

/**
 * The app's one icon component. Screens still pass a Font Awesome definition (`<FA icon={faGear} />`) because that is how they name
 * an icon; it is drawn here as the matching thin line icon (the paper-and-ink look). An icon with no line twin falls back to the
 * Font Awesome glyph so nothing ever renders blank. Size follows the surrounding font size, colour follows `currentColor`.
 */
const LINE: Record<string, LucideIcon> = {
  "align-left": AlignLeft, "arrow-down": ArrowDown, "arrow-left": ArrowLeft, "arrow-right": ArrowRight, "arrow-up": ArrowUp,
  "arrow-up-right-from-square": SquareArrowOutUpRight, ban: Ban, bars: Menu, bell: Bell, bold: Bold, bolt: Zap, "book-open": BookOpen,
  "box-archive": Archive, briefcase: Briefcase, broom: Brush, bullhorn: Megaphone, "calendar-day": Calendar, "calendar-days": CalendarDays,
  "chart-column": ChartColumn, "chart-pie": ChartPie, check: Check, "check-double": CheckCheck, "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft, "chevron-right": ChevronRight, "chevron-up": ChevronUp, circle: Circle, "circle-check": CircleCheck,
  "circle-nodes": Network, "circle-plus": CirclePlus, "clipboard-list": ClipboardList, clock: Clock, "clock-rotate-left": History, clone: Copy,
  "cloud-arrow-down": CloudDownload, code: Code, "code-branch": GitBranch, coins: Coins, comment: MessageCircle, "comment-dots": MessageCircleMore,
  comments: MessagesSquare, compass: Compass, compress: Minimize2, copy: Copy, crown: Crown, database: Database, desktop: Monitor,
  "diagram-project": Workflow, "earth-americas": Globe, ellipsis: Ellipsis, "ellipsis-vertical": EllipsisVertical, envelope: Mail,
  "envelope-circle-check": MailCheck, "envelope-open": MailOpen, "envelope-open-text": MailOpen, eraser: Eraser, expand: Maximize2, eye: Eye,
  "eye-slash": EyeOff, "face-smile": Smile, "feather-pointed": Feather, file: File, "file-export": FileUp, "file-import": FileDown,
  "file-lines": FileText, "file-pdf": FileText, filter: Filter, fingerprint: Fingerprint, fire: Flame, flag: Flag, folder: Folder,
  "folder-plus": FolderPlus, gear: Settings, "grip-vertical": GripVertical, "hand-pointer": Hand, handshake: Handshake, hashtag: Hash,
  heading: Heading, heart: Heart, "heart-pulse": HeartPulse, house: House, image: Image, inbox: Inbox, key: Key, keyboard: Keyboard,
  "layer-group": Layers, link: Link, "link-slash": Unlink, "list-check": ListChecks, "list-ul": List, "location-dot": MapPin, lock: Lock,
  "magnifying-glass": Search, "magnifying-glass-plus": ZoomIn, message: MessageSquare, microphone: Mic, minus: Minus, "mobile-screen": Smartphone,
  moon: Moon, newspaper: Newspaper, "note-sticky": StickyNote, palette: Palette, "paper-plane": Send, paperclip: Paperclip, pause: Pause,
  pen: Pen, "pen-nib": PenTool, "pen-to-square": SquarePen, play: Play, plug: Plug, "plug-circle-check": PlugZap, plus: Plus, "quote-left": Quote,
  reply: Reply, "right-from-bracket": LogOut, "right-to-bracket": LogIn, rotate: RefreshCw, "rotate-left": RotateCcw, "rotate-right": RotateCw,
  route: Route, rss: Rss, seedling: Sprout, "share-nodes": Share2, "shield-halved": Shield, "shoe-prints": Footprints, sliders: SlidersHorizontal,
  "spell-check": SpellCheck, spinner: Loader, "square-check": SquareCheck, star: Star, stop: Square, sun: Sun, table: Table,
  "table-cells": Table, "table-columns": Columns3, "tablet-screen-button": Tablet, tag: Tag, terminal: Terminal, thumbtack: Pin,
  "toggle-on": ToggleRight, trash: Trash2, "triangle-exclamation": TriangleAlert, user: User, "user-group": Users, "user-lock": UserLock,
  "user-plus": UserPlus, "user-shield": ShieldUser, users: Users, wallet: Wallet, "wand-magic-sparkles": WandSparkles, "wave-square": AudioWaveform,
  xmark: X,
};

type Props = Omit<ComponentProps<typeof FontAwesomeIcon>, "icon"> & { icon: IconDefinition };

export function Icon({ icon, className, spin, fixedWidth, ...rest }: Props) {
  const Line = LINE[icon.iconName];
  if (!Line) return <FontAwesomeIcon icon={icon} className={className} spin={spin} fixedWidth={fixedWidth} {...rest} />;
  const cls = ["inline-block shrink-0 align-[-0.125em]", fixedWidth ? "w-[1.25em]" : "", spin ? "animate-spin motion-reduce:animate-none" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <Line className={cls} width="1em" height="1em" strokeWidth={1.75} aria-hidden={rest["aria-hidden"] ?? true} />;
}
