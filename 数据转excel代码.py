import re
from pathlib import Path
import pandas as pd

# ========= 参数 =========
# 输入：md 文件（你后续都是 md，就统一用这个路径变量）
src_path = Path(r"C:\Users\44382\Desktop\21-本科-机械.md.out.md")
out_csv  = Path(r"C:\Users\44382\Desktop\21-本科-机械_去向汇总.csv")
out_xlsx = Path(r"C:\Users\44382\Desktop\21-本科-机械_去向汇总.xlsx")

# ========= 读取 md =========
text = src_path.read_text(encoding="utf-8", errors="ignore")

# ========= 正则：只抓 md 列表项 "- xxx" =========
# 兼容 "- 2021" / "-就业" / "- 比亚迪..." 等格式
item_pat = re.compile(r'^\s*-\s*(.*?)\s*$', re.M)
items = [m.group(1) for m in item_pat.finditer(text)]

# ========= 解析：按 4 行一组（年 / 类别 / 单位 / 人数） =========
year_pat = re.compile(r'^(19|20)\d{2}$')
num_pat  = re.compile(r'^\d+$')

rows = []
i = 0
while i + 3 < len(items):
    y, cat, org, cnt = items[i], items[i+1], items[i+2], items[i+3]
    if year_pat.fullmatch(y) and num_pat.fullmatch(cnt):
        rows.append((int(y), cat.strip(), org.strip(), int(cnt)))
        i += 4
    else:
        # 如果中间夹杂了非数据的 md 行（标题、空项等），就滑动窗口继续匹配
        i += 1

df = pd.DataFrame(rows, columns=["毕业年份", "就业类别", "单位名称", "人数"])

# 去重汇总（同年同类同单位多次出现时累加）
df = (
    df.groupby(["毕业年份", "就业类别", "单位名称"], as_index=False)["人数"]
      .sum()
      .sort_values(["毕业年份", "就业类别", "人数", "单位名称"],
                   ascending=[True, True, False, True])
)

# ========= 输出 =========
df.to_csv(out_csv, index=False, encoding="utf-8-sig")
df.to_excel(out_xlsx, index=False, sheet_name="汇总")

print("OK")
print("CSV:", out_csv)
print("XLSX:", out_xlsx)
print("行数:", len(df))
