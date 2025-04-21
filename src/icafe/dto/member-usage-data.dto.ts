export interface MemberUsageData {
  memberAccount: string;
  totalSeconds: number;
  sessionCount: number;
  lastActive: Date | null;
  totalTopups: number;
}
