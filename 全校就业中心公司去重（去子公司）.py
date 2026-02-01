import pandas as pd
import os
import re

# =========================
# 0) 路径配置
# =========================
input_path = r"C:\Users\44382\Desktop\毕业生去向数据表_清洗后.xlsx"

# 可选：特例映射表（你维护）
# 格式：两列
#   raw_name   canonical_name
# 例： "长安福特汽车有限公司"  -> "长安福特"
#     "重庆长安汽车股份有限公司" -> "长安汽车"
special_cases_path = r"C:\Users\44382\Desktop\special_cases.xlsx"

desktop = os.path.join(os.path.expanduser("~"), "Desktop")
output_path = os.path.join(desktop, "就业_企业去重后.xlsx")

# =========================
# 1) 读取数据
# =========================
df = pd.read_excel(input_path)

REQUIRED = {"学部", "学院", "学历", "毕业年度", "去向类别", "单位名称", "人数"}
missing = REQUIRED - set(df.columns)
if missing:
    raise ValueError(f"缺少列：{missing}。请检查表头是否一致。")

# 只处理“就业”
work = df[df["去向类别"] == "就业"].copy()

# 这两类建议不参与企业去重（避免污染）
EXCLUDE_UNITS = {"其他", "政策性服务 / 基层服务项目"}
work = work[~work["单位名称"].isin(EXCLUDE_UNITS)].copy()

# =========================
# 2) 加载特例映射表（可选）
# =========================
# 你可以先不建这个文件，脚本会自动跳过
special_map = {}
if os.path.exists(special_cases_path):
    sc = pd.read_excel(special_cases_path)
    cols = set(sc.columns)
    if not {"raw_name", "canonical_name"} <= cols:
        raise ValueError("special_cases.xlsx 需要两列：raw_name、canonical_name")
    # 做一次标准化再进字典，防止空格/句号影响匹配
    def _norm_for_map(x: str) -> str:
        x = "" if pd.isna(x) else str(x)
        x = x.strip()
        x = re.sub(r"\s+", "", x)
        x = x.translate(str.maketrans("", "", "。．.、,，;；:：!！?？"))
        return x
    special_map = dict(zip(sc["raw_name"].map(_norm_for_map), sc["canonical_name"].astype(str)))

# =========================
# 3) 通用标准化 + 主体抽取
# =========================
PUNCT = "。．.、,，;；:：!！?？"  # 常见标点
LEGAL_SUFFIX = [
    "有限责任公司", "股份有限公司", "集团有限公司", "有限公司", "股份公司"
]

# 分支机构关键词
BRANCH_WORDS = r"(分公司|子公司|支公司|分部|办事处|营业部|中心|项目部|代表处|分院|分所)"
# 常见地域词（用于“紧挨分支词”的删除）
CITIES = [
    "北京","上海","天津","重庆","广州","深圳","杭州","南京","苏州","无锡","常州","宁波","厦门","福州",
    "武汉","长沙","南昌","合肥","郑州","西安","成都","昆明","贵阳","南宁","海口","济南","青岛","烟台",
    "大连","沈阳","长春","哈尔滨","石家庄","太原","呼和浩特","兰州","西宁","银川","乌鲁木齐",
    "四川","广东","江苏","浙江","山东","湖北","湖南","河南","陕西","福建","江西","安徽","广西",
    "中国"
]
CITY_PATTERN = "(" + "|".join(map(re.escape, CITIES)) + ")"

# 仅前缀级别去地域（避免误伤内部字样）
GEO_PREFIX = ["中国", "重庆", "北京", "上海", "深圳", "广州", "杭州", "成都", "南京", "武汉", "西安", "苏州"]

def normalize_name(s: str) -> str:
    s = "" if pd.isna(s) else str(s)
    s = s.strip()
    s = re.sub(r"\s+", "", s)  # 去所有空白（含换行）
    s = s.translate(str.maketrans("", "", PUNCT))  # 去标点（尤其全角句号）
    return s

def extract_subject(raw_name: str) -> str:
    s0 = normalize_name(raw_name)

    # 先用特例表覆盖（最强优先级）
    if s0 in special_map:
        return special_map[s0].strip()

    s = s0

    # 1) 去地域前缀（只去一次）
    for p in GEO_PREFIX:
        if s.startswith(p):
            s = s[len(p):]
            break

    # 2) 去法定后缀（强规则）
    for suf in LEGAL_SUFFIX:
        s = s.replace(suf, "")

    # 3) 去“城市 + 分支机构”中的城市（关键：一汽解放成都分公司 -> 一汽解放分公司）
    s = re.sub(CITY_PATTERN + r"(?=" + BRANCH_WORDS + r")", "", s)

    # 4) 去分支机构词本身
    s = re.sub(BRANCH_WORDS, "", s)

    # 5) 去括号内容符号（不删除括号内文字，避免误伤；仅去括号符）
    s = s.replace("（", "").replace("）", "").replace("(", "").replace(")", "")
    s = s.replace("【", "").replace("】", "").replace("[", "").replace("]", "")

    # 6) 常见连接符
    s = re.sub(r"[·•\-—_]+", "", s).strip()

    return s

work["公司主体"] = work["单位名称"].apply(extract_subject)

# =========================
# 4) 主体 -> 展示名：主体下人数最多的原始单位名（同主体统一展示）
# =========================
display = (
    work.groupby(["公司主体", "单位名称"], as_index=False)["人数"]
        .sum()
        .sort_values(["公司主体", "人数"], ascending=[True, False])
        .drop_duplicates(subset=["公司主体"])
        .rename(columns={"单位名称": "展示公司名"})[["公司主体", "展示公司名"]]
)

work2 = work.merge(display, on="公司主体", how="left")
work2["单位名称"] = work2["展示公司名"]

# =========================
# 5) 重新聚合（列一个都不省略）
# =========================
out = (
    work2.groupby(
        ["学部","学院","学历","毕业年度","去向类别","单位名称"],
        as_index=False
    )["人数"].sum()
)

out.to_excel(output_path, index=False)
print("已生成：", output_path)
print("特例表加载：", "是" if special_map else "否（未找到 special_cases.xlsx 或为空）")
