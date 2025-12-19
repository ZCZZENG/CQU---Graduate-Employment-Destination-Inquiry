import re
from pathlib import Path

# ====== 你只需要改这里 ======
TARGET_PATH = r"C:\Users\44382\Desktop\21-本科-机械.md"   # 目标文件：要被替换“其他”的那个
REF_PATH    = r"C:\Users\44382\Desktop\21机械毕业生去向.md"  # 参考名单：21机械毕业生去向
# ===========================

OTHER_WORD = "其他"

# 规范化：把中英文括号统一、去掉两端空白（不乱删中间空格，避免误伤）
def norm(s: str) -> str:
    s = s.strip()
    s = s.replace("（", "(").replace("）", ")")
    s = re.sub(r"[ \t]+", " ", s)  # 仅压缩空格/制表为单空格（不动换行）
    return s

# 从“21机械毕业生去向.md”中抽取“单位名单”
# 该文件看起来是一行一个单位（不是四行块），所以直接按行取非空即可
def load_ref_units(ref_path: str) -> set[str]:
    text = Path(ref_path).read_text(encoding="utf-8", errors="ignore")
    units = set()
    for line in text.splitlines():
        line = norm(line)
        if not line:
            continue
        # 过滤明显不是单位的残片（你的参考文件开头有些异常碎片字符，如 ")"、"司" 等:contentReference[oaicite:1]{index=1}:contentReference[oaicite:2]{index=2}）
        if line in {")", "司", "中"}:
            continue
        units.add(line)
    return units

REF_UNITS = load_ref_units(REF_PATH)

# 目标文件的块结构（严格 4 行：year/type/unit/count），块与块之间可能有空行
# 关键点：把“单位行”分成三段：行首 "- "、单位内容、行尾换行，这样替换不破坏格式
BLOCK_RE = re.compile(
    r"(?ms)"
    r"(?P<yline>^-\s*(?P<year>\d{4})\s*\r?\n)"
    r"(?P<tline>^-\s*(?P<type>[^\r\n]+?)\s*\r?\n)"
    r"(?P<uline>^-\s*(?P<unit>[^\r\n]+?)\s*(?P<uline_end>\r?\n))"
    r"(?P<cline>^-\s*(?P<count>\d+)\s*(?P<cline_end>\r?\n|$))"
)

def replace_in_text(text: str) -> str:
    def _sub(m: re.Match) -> str:
        year = m.group("year")
        typ = norm(m.group("type"))
        unit_raw = m.group("unit")           # 保留原样用于输出（不动格式）
        unit_n = norm(unit_raw)
        count_s = m.group("count")

        # 约束：只处理 count == 1
        try:
            count = int(count_s)
        except ValueError:
            count = -1

        # 只在：就业 + count=1 + 单位不在参考名单 → 替换为“其他”
        if typ == "就业" and count == 1 and unit_n not in REF_UNITS:
            # 只替换单位内容，不动 "- " 前缀、不动换行/空行
            return (
                m.group("yline")
                + m.group("tline")
                + "- " + OTHER_WORD + m.group("uline_end")
                + m.group("cline")
            )

        # 否则原样返回（严格保持格式）
        return m.group(0)

    return BLOCK_RE.sub(_sub, text)

def main():
    target = Path(TARGET_PATH)
    raw = target.read_text(encoding="utf-8", errors="ignore")
    out = replace_in_text(raw)

    # 输出到同目录：原文件名 + ".out.md"
    out_path = target.with_suffix(target.suffix + ".out.md")
    out_path.write_text(out, encoding="utf-8")
    print(f"完成：{out_path}")

if __name__ == "__main__":
    main()
