import pandas as pd

# === 1. 读入原始数据（桌面） ===
input_path = r"C:\Users\44382\Desktop\毕业生去向数据表.xlsx"

df = pd.read_excel(input_path)

# === 2. 规则处理 ===
# 仅处理：就业 + 本科/硕士 + 人数 < 2
mask = (
    (df["去向类别"] == "就业") &
    (df["学历"].isin(["本科", "硕士"])) &
    (df["人数"] < 2)
)

df.loc[mask, "单位名称"] = "其他"

# === 3. 重新聚合（防止重复行） ===
df_cleaned = (
    df.groupby(
        ["学部", "学院", "学历", "毕业年度", "去向类别", "单位名称"],
        as_index=False
    )["人数"]
    .sum()
)

# === 4. 输出到桌面 ===
output_path = r"C:\Users\44382\Desktop\毕业生去向数据表_清洗后.xlsx"
df_cleaned.to_excel(output_path, index=False)

print("处理完成，文件已生成：", output_path)
