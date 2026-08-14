import { holoworkAchievements } from '../constants/holodori-constants';

import type { HoloworkAchievementProgress } from '../types/holowork-achievement-progress';

/** ホロワーク完了回数のアチーブメント進捗を計算するサービス */
export class HoloworkAchievementsService {
  /** 現在のホロワーク完了回数から次回閾値と残り回数を算出する */
  public static calcProgress(currentCount: number): HoloworkAchievementProgress {
    const nextThreshold = holoworkAchievements.find(achievement => achievement > currentCount) ?? null;
    return {
      next_threshold : nextThreshold,
      remaining_count: nextThreshold == null ? null : nextThreshold - currentCount
    };
  }
}
