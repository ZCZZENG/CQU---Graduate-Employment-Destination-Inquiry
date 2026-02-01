import re
import pandas as pd
from pathlib import Path

MD_PATH  = r"C:\Users\44382\Desktop\各个学院URL.md"
CSV_IN   = r"C:\Users\44382\Desktop\CQUPM_Employment_DB\raw\master_raw.csv"
CSV_OUT  = r"C:\Users\44382\Desktop\CQUPM_Employment_DB\raw\master_raw_fixed.csv"

def read_text_auto(path: str) -> str:
    p = Path(path)
    for enc in ("utf-8", "utf-8-sig", "gbk"):
        try:
            return p.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    # 最后兜底：忽略非法字符
    return p.read_text(encoding="utf-8", errors="ignore")

def load_school_map(md_path: str):
    """
    解析 各个学院URL.md
    产出: {school_id: {"学部": xxx, "学院": xxx, "url": xxx}}
    兼容标题行：
    - '## 信息学部'
    - '- ## 社会科学学部'
    条目行：
    - '- 学院名 URL'
    """
    text = read_text_auto(md_path)
    current_div = None
    school_map = {}

    for raw in text.splitlines():
        line = raw.strip()

        # 标题：## xxx 或 - ## xxx
        m = re.match(r"(?:-?\s*)##\s*(.+)", line)
        if m:
            current_div = m.group(1).strip()
            continue

        # 条目：- 学院名 URL
        m = re.match(r"-\s*(\S.+?)\s+(https?://\S+)", line)
        if m and current_div:
            college = m.group(1).strip()
            url = m.group(2).strip()
            sm = re.search(r"[\?&]school=(\d+)", url)
            if sm:
                sid = int(sm.group(1))
                school_map[sid] = {"学部": current_div, "学院": college, "url": url}

    if not school_map:
        raise RuntimeError("未能从 md 解析出任何 school_id 映射。请检查 md 格式是否为：标题(## 学部) + 列表(- 学院 URL)。")

    return school_map

def read_csv_auto(path: str) -> pd.DataFrame:
    for enc in ("utf-8-sig", "utf-8", "gbk"):
        try:
            return pd.read_csv(path, encoding=enc)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, encoding="utf-8", errors="ignore")

def main():
    school_map = load_school_map(MD_PATH)
    df = read_csv_auto(CSV_IN)

    # 关键字段校验
    if "school_id" not in df.columns:
        raise RuntimeError("CSV 缺少 school_id 列，无法按 school_id 修正学部。")

    # 修正：学部、学院强制按映射覆盖
    def get_div(x):
        try:
            sid = int(x)
        except Exception:
            return "未知"
        return school_map.get(sid, {}).get("学部", "未知")

    def get_college(x):
        try:
            sid = int(x)
        except Exception:
            return "未知"
        return school_map.get(sid, {}).get("学院", "未知")

    df["学部"] = df["school_id"].map(get_div)
    df["学院"] = df["school_id"].map(get_college)

    # 输出前做个统计，快速发现映射缺失
    unknown_rows = df[df["学部"] == "未知"]
    if len(unknown_rows) > 0:
        unknown_sids = sorted(set(unknown_rows["school_id"].tolist()))
        print(f"[WARN] 有 {len(unknown_rows)} 行 school_id 不在 md 映射中，已标记“未知”。school_id 列表：{unknown_sids[:30]}{'...' if len(unknown_sids) > 30 else ''}")

    df.to_csv(CSV_OUT, index=False, encoding="utf-8-sig")
    print(f"[OK] 修正完成，已输出：{CSV_OUT}")
    print(f"[INFO] 学部种类数：{df['学部'].nunique()}；学院种类数：{df['学院'].nunique()}")

if __name__ == "__main__":
    main()
