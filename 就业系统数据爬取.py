import re
import json
import time
import random
from pathlib import Path

import requests
import pandas as pd


# =========================
# 0) 基础配置
# =========================
DESKTOP = Path.home() / "Desktop"
ROOT = DESKTOP / "CQUPM_Employment_DB"

MD_PATH = DESKTOP / "各个学院URL.md"          # 你的学院清单（按学部分组）
RAW_PATH = ROOT / "raw" / "master_raw.csv"  # 唯一源表
STATE_PATH = ROOT / "_state.json"           # 断点续跑状态
FAIL_LOG = ROOT / "failed_requests.log"     # 失败日志
BACKUP_DIR = ROOT / "raw" / "_backups"      # 可选备份

ROOT.mkdir(parents=True, exist_ok=True)
(ROOT / "raw").mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# ✅ 站点参数用“届次”：21/22/23（不是 2021/2022/2023）
GRADES = [21, 22, 23]

# 学历参数（你已验证）
EDUCATIONS = {
    "本科": "30",
    "硕士": "11",
    "博士": "01",
}

# 限速：更保守（你可再调大）
SLEEP_RANGE = (6.0, 12.0)

BASE_URL = (
    "https://cqu.cqbys.com/affair/lnjydw/search/domain/cqu/"
    "grade/23/education//school/{school}/major//University1950Lnjydw%5Bjylb%5D//submit/1/page/{page}"
)
QUERY = "?grade={grade}&education={edu}&school={school}&major=&University1950Lnjydw%5Bjylb%5D=&submit=1"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://cqu.cqbys.com/",
}


# =========================
# 1) 工具：限速、状态、原子写入
# =========================
def polite_sleep():
    time.sleep(random.uniform(*SLEEP_RANGE))


def load_state() -> dict:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict) -> None:
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def atomic_write_csv(df: pd.DataFrame, path: Path) -> None:
    """
    事务式写入：先写 tmp，再替换，避免写到一半崩溃导致文件损坏
    """
    tmp = path.with_suffix(".tmp")
    df.to_csv(tmp, index=False, encoding="utf-8-sig")
    tmp.replace(path)


def append_fail_log(msg: str) -> None:
    old = FAIL_LOG.read_text(encoding="utf-8") if FAIL_LOG.exists() else ""
    FAIL_LOG.write_text(old + msg + "\n", encoding="utf-8")


# =========================
# 2) 解析：md -> 学部/学院/school_id
# =========================
def parse_md_school_list(md_text: str):
    """
    md 格式（你文件）：
    ## 人文学部
    - 外国语学院 https://...school=xxx...
    """
    items = []
    current_bu = None

    for raw in md_text.splitlines():
        line = raw.strip()
        if not line:
            continue

        m_bu = re.match(r"^##\s*(.+学部)\s*$", line)
        if m_bu:
            current_bu = m_bu.group(1).strip()
            continue

        m_school = re.match(r"^-+\s*([^\s]+)\s+(https?://\S+)$", line)
        if m_school and current_bu:
            school_name = m_school.group(1).strip()
            url = m_school.group(2).strip()

            m_id = re.search(r"[?&]school=(\d+)", url)
            if not m_id:
                continue

            items.append({
                "学部": current_bu,
                "学院": school_name,
                "school_id": int(m_id.group(1)),
            })

    return items


# =========================
# 3) 请求：带重试 + 诊断信息
# =========================
def fetch_with_retry(session: requests.Session, url: str, max_retries: int = 6) -> str:
    last_exc = None

    for attempt in range(1, max_retries + 1):
        try:
            r = session.get(url, headers=HEADERS, timeout=40, allow_redirects=True)

            # 这几个码通常是临时压力/维护
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")

            if r.status_code != 200:
                raise requests.HTTPError(f"HTTP {r.status_code}")

            text = r.text

            # 简单兜底：如果被重定向到登录/异常页
            if ("login" in text.lower() and "password" in text.lower()) or ("验证码" in text):
                raise RuntimeError("looks like login/captcha page")

            return text

        except Exception as e:
            last_exc = e
            backoff = min(120, (2 ** (attempt - 1)) + random.random() * 3)
            print(f"[retry {attempt}/{max_retries}] {e} | sleep {backoff:.1f}s")
            time.sleep(backoff)

    # 最终失败：写日志，抛异常
    append_fail_log(f"FAILED: {url}\nLAST: {last_exc}\n")
    raise RuntimeError("request failed")


# =========================
# 4) 解析：HTML -> 页数 + 数据行
# =========================
def parse_total_pages(html: str) -> int:
    m = re.search(r"共\s*(\d+)\s*页", html)
    return int(m.group(1)) if m else 1


def parse_rows_from_li_titles(html: str):
    """
    页面数据结构：<li title="2023">2023</li> ...
    每4个 title 组成一行：毕业年度/去向类别/单位名称/人数
    """
    titles = re.findall(r'<li[^>]*\btitle="([^"]*)"', html)
    rows = []

    for i in range(0, len(titles) - 3, 4):
        y, cat, org, cnt = titles[i:i+4]
        if not re.fullmatch(r"\d{4}", y):
            continue
        if not re.fullmatch(r"\d+", cnt):
            continue

        rows.append({
            "毕业年度": int(y),
            "去向类别": cat,
            "单位名称": org,
            "人数": int(cnt),
        })

    return rows


# =========================
# 5) 读写 master：强去重（防重复）
# =========================
MASTER_COLUMNS = [
    "学部", "学院", "school_id",
    "届次", "学历", "education_code",
    "毕业年度", "去向类别", "单位名称", "人数"
]

DEDUP_KEYS = ["school_id", "届次", "学历", "去向类别", "单位名称"]


def load_master() -> pd.DataFrame:
    if RAW_PATH.exists():
        df = pd.read_csv(RAW_PATH, encoding="utf-8-sig")
        # 保障列齐全
        for c in MASTER_COLUMNS:
            if c not in df.columns:
                df[c] = None
        return df[MASTER_COLUMNS]
    return pd.DataFrame(columns=MASTER_COLUMNS)


def merge_and_save_master(master: pd.DataFrame, df_new: pd.DataFrame) -> pd.DataFrame:
    if df_new.empty:
        return master

    master = pd.concat([master, df_new], ignore_index=True)

    # 强制类型
    if "人数" in master.columns:
        master["人数"] = pd.to_numeric(master["人数"], errors="coerce").fillna(0).astype(int)

    # ✅ 强制防重复：同一键只保留最后一条
    master = master.drop_duplicates(subset=DEDUP_KEYS, keep="last")

    atomic_write_csv(master, RAW_PATH)
    return master


# =========================
# 6) 主流程：按“学院级 checkpoint”保存
# =========================
def main():
    if not MD_PATH.exists():
        raise FileNotFoundError(f"找不到：{MD_PATH}（请把 各个学院URL.md 放到桌面）")

    md_text = MD_PATH.read_text(encoding="utf-8")
    schools = parse_md_school_list(md_text)
    if not schools:
        raise RuntimeError("md 解析不到学院列表：请检查 md 是否为 '## 学部' + '- 学院 URL' 格式")

    session = requests.Session()

    state = load_state()
    master = load_master()

    for idx, s in enumerate(schools, start=1):
        school_id = s["school_id"]
        school_name = s["学院"]
        bu_name = s["学部"]

        print(f"\n===== [{idx}/{len(schools)}] {bu_name} / {school_name} (school={school_id}) =====")

        # 每个学院单独缓存（checkpoint）
        school_rows = []

        for grade in GRADES:
            for edu_name, edu_code in EDUCATIONS.items():
                key = f"{school_id}_{grade}_{edu_code}"
                if state.get(key):
                    print(f"[skip combo] {school_name} {grade}届 {edu_name}")
                    continue

                print(f"[run combo] {school_name} {grade}届 {edu_name}")

                url1 = BASE_URL.format(school=school_id, page=1) + QUERY.format(
                    grade=grade, edu=edu_code, school=school_id
                )

                polite_sleep()
                try:
                    html1 = fetch_with_retry(session, url1)
                except Exception as e:
                    print(f"[fail combo] {school_name} {grade}届 {edu_name} -> {e}")
                    # 不标记完成，让后续可重跑
                    continue

                pages = parse_total_pages(html1)

                # page 1
                rows = parse_rows_from_li_titles(html1)
                for r in rows:
                    r.update({
                        "学部": bu_name,
                        "学院": school_name,
                        "school_id": school_id,
                        "届次": grade,
                        "学历": edu_name,
                        "education_code": edu_code,
                    })
                school_rows.extend(rows)

                # page 2..N
                for p in range(2, pages + 1):
                    url = BASE_URL.format(school=school_id, page=p) + QUERY.format(
                        grade=grade, edu=edu_code, school=school_id
                    )
                    polite_sleep()
                    try:
                        html = fetch_with_retry(session, url)
                    except Exception as e:
                        print(f"[fail page] {school_name} {grade}届 {edu_name} page={p} -> {e}")
                        break

                    rows = parse_rows_from_li_titles(html)
                    for r in rows:
                        r.update({
                            "学部": bu_name,
                            "学院": school_name,
                            "school_id": school_id,
                            "届次": grade,
                            "学历": edu_name,
                            "education_code": edu_code,
                        })
                    school_rows.extend(rows)

                # ✅ 组合跑完就标记（即使这一组合数据为空也标记，避免无限重跑）
                state[key] = True
                save_state(state)

        # ✅ 学院级 checkpoint：抓完一个学院立刻落盘（并防重复）
        if school_rows:
            df_new = pd.DataFrame(school_rows)

            # 补齐 master 列（确保字段一致）
            for c in MASTER_COLUMNS:
                if c not in df_new.columns:
                    df_new[c] = None
            df_new = df_new[MASTER_COLUMNS]

            master = merge_and_save_master(master, df_new)
            print(f"[saved school] {school_name} new_rows={len(df_new)} master_rows={len(master)}")
        else:
            print(f"[no data] {school_name}（本次未抓到任何数据）")

        # 可选：每 5 个学院备份一次，进一步防崩
        if idx % 5 == 0 and RAW_PATH.exists():
            backup = BACKUP_DIR / f"master_raw_backup_{idx}.csv"
            # 直接复制当前 master（已在内存）
            atomic_write_csv(master, backup)
            print(f"[backup] -> {backup}")

    print("\nDONE.")
    print("master ->", RAW_PATH)
    if FAIL_LOG.exists():
        print("fail log ->", FAIL_LOG)
    print("state ->", STATE_PATH)


if __name__ == "__main__":
    main()
