#!/usr/bin/env python3
"""
将机械工程学院复试成绩PDF转换为Excel和CSV格式
"""
import pdfplumber
import csv
import sys

def main():
    pdf_path = r'C:\Users\Zhang Cloud\Downloads\机械工程学院2026年硕士研究生复试成绩及拟录取名单（含专项计划） (1).pdf'

    pdf = pdfplumber.open(pdf_path)
    print(f"总页数: {len(pdf.pages)}", flush=True)

    all_rows = []
    headers = None

    for page_num, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for table in tables:
            for row in table:
                # 清理每个单元格
                cleaned = [cell.strip().replace('\n', ' ') if cell else '' for cell in row]
                # 跳过空行
                if all(c == '' for c in cleaned):
                    continue
                # 第一个非空行作为表头（只取一次）
                if headers is None:
                    headers = cleaned
                    continue
                # 跳过重复的表头行
                if cleaned == headers:
                    continue
                all_rows.append(cleaned)

    pdf.close()

    print(f"表头: {headers}", flush=True)
    print(f"数据行数: {len(all_rows)}", flush=True)

    # 保存为CSV
    csv_path = r'C:\Users\Zhang Cloud\Downloads\机械工程学院2026年复试成绩及拟录取名单.csv'
    with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(all_rows)
    print(f"CSV已保存: {csv_path}", flush=True)

    # 保存为Excel
    try:
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "复试成绩及拟录取名单"
        ws.append(headers)
        for row in all_rows:
            ws.append(row)

        # 自动调整列宽
        for col in ws.columns:
            max_len = 0
            col_letter = col[0].column_letter
            for cell in col:
                try:
                    val = str(cell.value) if cell.value else ''
                    # 中文字符算2个宽度
                    length = sum(2 if ord(c) > 127 else 1 for c in val)
                    max_len = max(max_len, length)
                except:
                    pass
            ws.column_dimensions[col_letter].width = min(max_len + 2, 40)

        xlsx_path = r'C:\Users\Zhang Cloud\Downloads\机械工程学院2026年复试成绩及拟录取名单.xlsx'
        wb.save(xlsx_path)
        print(f"Excel已保存: {xlsx_path}", flush=True)
    except ImportError:
        print("openpyxl未安装，跳过Excel生成", flush=True)

if __name__ == "__main__":
    main()
