import re
import time
import random
from pathlib import Path
from typing import List, Dict, Tuple

import requests
import pandas as pd


BASE_URL = "https://cqu.cqbys.com/affair/lnjydw/search/domain/cqu/grade/23/education//school/{school}/major//University1950Lnjydw%5Bjylb%5D//submit/1/page/{page}"
QUERY_TEMPLATE = "?grade={grade}&education=&school={school}&major=&University1950Lnjydw%5Bjylb%5D=&submit=1"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://cqu.cqbys.com/",
}

# 你要爬的学院（可继续加）
SCHOOLS: Dict[str, int] = {
    "微电子学院": 123,
    "计算机学院": 124,
    "大数据学院": 126,
}

# 你要爬的届次（可继续加）
GRADES = [21, 22, 23]


# ----------------------------
# 解析：总页数 + 表格行（li title=...）
# ----------------------------

def parse_total_pages(html: str) -> int:
    m = re.search(r"共\s*(\d+)\s*页", html)
    return int(m.group(1)) if m else 1


def parse_rows_from_li_titles(html: str) -> List[List[str]]:
    # 抓 <li ... title="xxx"> 的 title 值
    titles = re.findall(r'<li[^>]*\btitle="([^"]*)"', html)
    rows: List[List[str]] = []

    for i in range(0, len(titles) - 3, 4):
        y, cat, org, cnt = titles[i:i+4]
        if not re.fullmatch(r"\d{4}", y):
            continue
        if not re.fullmatch(r"\d+", cnt):
            continue
        rows.append([y, cat, org, cnt])

    return rows


# ----------------------------
# 请求：限速 + 重试（避免把站打挂）
# ----------------------------

def polite_sleep(base: Tuple[float, float] = (1.2, 2.2)):
    time.sleep(random.uniform(*base))


def fetch_with_retry(session: requests.Session, url: str, max_retries: int = 5) -> str:
    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            r = session.get(url, headers=HEADERS, timeout=25)
            # 429/5xx 认为需要退避
            if r.status_code in (429, 500, 502, 503, 504):
                raise requests.HTTPError(f"HTTP {r.status_code}")
            r.raise_for_status()
            return r.text
        except Exception as e:
            last_exc = e
            # 指数退避 + 抖动
            backoff = min(60, (2 ** (attempt - 1)) + random.random())
            print(f"[retry {attempt}/{max_retries}] {url} -> {e} | sleep {backoff:.1f}s")
            time.sleep(backoff)

    raise RuntimeError(f"Failed after retries: {url} | last={last_exc}")


# ----------------------------
# 单个 (学院, 届次) 全量爬取
# ----------------------------

def crawl_one(session: requests.Session, school_name: str, school_id: int, grade: int,
              sleep_range: Tuple[float, float] = (1.2, 2.2)) -> pd.DataFrame:
    # page=1
    url1 = BASE_URL.format(school=school_id, page=1) + QUERY_TEMPLATE.format(grade=grade, school=school_id)
    polite_sleep(sleep_range)
    html1 = fetch_with_retry(session, url1)

    total_pages = parse_total_pages(html1)
    rows = parse_rows_from_li_titles(html1)

    print(f"{school_name} | {grade}届 | pages={total_pages} | page1_rows={len(rows)}")

    all_rows = []
    all_rows.extend(rows)

    for p in range(2, total_pages + 1):
        url = BASE_URL.format(school=school_id, page=p) + QUERY_TEMPLATE.format(grade=grade, school=school_id)
        polite_sleep(sleep_range)
        html = fetch_with_retry(session, url)
        rws = parse_rows_from_li_titles(html)
        all_rows.extend(rws)
        print(f"  page {p}/{total_pages} rows={len(rws)} total={len(all_rows)}")

    df = pd.DataFrame(all_rows, columns=["毕业年度", "就业类别", "单位名称", "人数"])
    # 增加维度字段，方便后续合并分析
    df.insert(0, "学院", school_name)
    df.insert(1, "届次", grade)

    return df


# ----------------------------
# 主程序：批量爬取 + 命名保存
# ----------------------------

def main():
    desktop = Path.home() / "Desktop"
    out_dir = desktop / "cqu_lnjydw_exports"
    out_dir.mkdir(parents=True, exist_ok=True)

    # 全局 session 复用连接
    session = requests.Session()

    # 你想更保守就把这个调大，比如 (2.5, 4.0)
    sleep_range = (1.5, 3.0)

    # 也保存一份总表（可选）
    all_dfs = []

    for school_name, school_id in SCHOOLS.items():
        for grade in GRADES:
            df = crawl_one(session, school_name, school_id, grade, sleep_range=sleep_range)

            # 文件名：学院_届次.csv
            filename = f"{school_name}_{grade}届.csv"
            out_path = out_dir / filename
            df.to_csv(out_path, index=False, encoding="utf-8-sig")
            print(f"[saved] {out_path} rows={len(df)}")

            all_dfs.append(df)

    # 合并总表
    merged = pd.concat(all_dfs, ignore_index=True)
    merged_path = out_dir / "三学院_21-23届_汇总.csv"
    merged.to_csv(merged_path, index=False, encoding="utf-8-sig")
    print(f"[saved] {merged_path} rows={len(merged)}")


if __name__ == "__main__":
    main()
