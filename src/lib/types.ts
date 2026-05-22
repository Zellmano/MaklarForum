export type UserRole = "consumer" | "agent" | "admin";

export type VerificationStatus = "pending" | "verified" | "suspended";

export type QuestionCategory = "kopa" | "salja" | "juridik" | "vardering" | "flytt" | "ovrigt";

export type GeoScope = "local" | "regional" | "open";

export interface AgentProfile {
  id: string;
  fullName: string;
  slug: string;
  firm: string;
  title: string;
  city: string;
  municipalities: string[];
  bio: string;
  fmiNumber: string;
  verificationStatus: VerificationStatus;
  premium: boolean;
  soldCount: number;
  activeCount: number;
  profileViews: number;
  avatarUrl?: string | null;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  body: string;
  askedBy: string;
  audience: "buyer" | "seller" | "general";
  category: QuestionCategory;
  geoScope: GeoScope;
  municipality?: string;
  region?: string;
  createdAt: string;
  helpfulVotes: number;
  answerCount: number;
}

export interface Answer {
  id: string;
  questionId: string;
  answeredBy: string;
  body: string;
  helpfulVotes: number;
  upVotes?: number;
  downVotes?: number;
  myVote?: -1 | 0 | 1;
  createdAt: string;
  comment?: string;
}

export interface GuideArticle {
  slug: string;
  title: string;
  excerpt: string;
  minutes: number;
  section: "kopare" | "saljare";
  content: string[];
}

export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  whyItMatters: string;
}

export interface WatchedThread {
  questionId: string;
  questionSlug: string;
  title: string;
  createdAt: string;
  answerCount: number;
}

export interface MessageThread {
  otherUserId: string;
  otherUserName: string;
  otherUserRole: UserRole;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  senderName: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  municipality: string;
  region: string;
  status: "pending" | "approved" | "rejected";
  memberCount: number;
  isMember: boolean;
}

export interface PendingModerationItem {
  id: string;
  questionId: string | null;
  questionTitle: string;
  proposedBy: string;
  proposedByName: string;
  body: string;
  blockedTerms: string[];
  createdAt: string;
}

export interface AgentTip {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  audience: "buyer" | "seller" | "general";
  geoScope: "local" | "regional" | "open";
  municipality?: string;
  region?: string;
  score: number;
  upVotes: number;
  downVotes: number;
  myVote: -1 | 0 | 1;
  createdAt: string;
}
