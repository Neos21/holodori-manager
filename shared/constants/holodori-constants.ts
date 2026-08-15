/** レア度 : 星3 */
export const star3 = 3 as const;
/** レア度 : 星4 */
export const star4 = 4 as const;
/** レア度 : 星5 */
export const star5 = 5 as const;
/** カードのレア度の選択肢 (昇順) */
export const rarities = [star3, star4, star5] as const;

/** 開花度 0 */
export const bloom0 = 0 as const;
/** 開花度 1 */
export const bloom1 = 1 as const;
/** 開花度 2 */
export const bloom2 = 2 as const;
/** 開花度 3 */
export const bloom3 = 3 as const;
/** 開花度 4 */
export const bloom4 = 4 as const;
/** 開花度 5 */
export const bloom5 = 5 as const;
/** カードの開花度の選択肢 (昇順) */
export const blooms = [bloom0, bloom1, bloom2, bloom3, bloom4, bloom5] as const;

/** カードのデフォルト Lv */
export const defaultCardLevel = 1 as const;

/** ホロメンボードマスのカテゴリ : 黄 */
export const boardNodeCategoryYellow = 'yellow' as const;
/** ホロメンボードマスのカテゴリ : 緑 */
export const boardNodeCategoryGreen  = 'green'  as const;
/** ホロメンボードマスのカテゴリ : 赤 */
export const boardNodeCategoryRed    = 'red'    as const;
/** ホロメンボードマスのカテゴリ : 青 */
export const boardNodeCategoryBlue   = 'blue'   as const;
/** ホロメンボードマスの全カテゴリ (ソート表示を優先したい順) */
export const boardNodeCategories = [boardNodeCategoryYellow, boardNodeCategoryGreen, boardNodeCategoryRed, boardNodeCategoryBlue] as const;

/** ホロワーク完了回数のアチーブメント閾値・次回閾値の検索に使用するため昇順で定義する */
export const holoworkAchievements = [1, 5, 10, 30, 50, 100, 200, 300, 400] as const;

/** ホロワークを開始・完了できる最小メンバー数 */
export const minimumHoloworkMemberCount = 1 as const;
/** ホロワークを開始・完了できる最大メンバー数 */
export const maximumHoloworkMemberCount = 5 as const;
