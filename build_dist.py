# -*- coding: utf-8 -*-
"""
公開用ビルド生成: 07.local_dashboard と参照CSVを dist/ にまとめ、
データ参照を相対パス(data/...)へ書き換える。静的ホスティングにそのまま載せられる。

使い方:  python3 build_dist.py
出力:    dist/  （index.html, 各ページ, *.css, *.js, data/*.csv）
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "07.local_dashboard")
RAW = os.path.join(ROOT, "06.raw_data")
DIST = os.path.join(ROOT, "dist")
DATA = os.path.join(DIST, "data")

# 公開ビルドに含めない開発用ファイル
EXCLUDE = {"server.mjs", "start_dashboard.cmd", "README.md"}
# 書き換え対象（テキスト）拡張子
TEXT_EXT = {".html", ".js", ".css"}
REF_RE = re.compile(r"\.\./06\.raw_data/[^'\"]+?\.csv")


def main():
    # 既存distを掃除（マウントによりrmtreeが一部失敗しても継続）
    if os.path.exists(DIST):
        shutil.rmtree(DIST, ignore_errors=True)
        for dp, _, fs in os.walk(DIST, topdown=False):
            for fn in fs:
                try: os.remove(os.path.join(dp, fn))
                except OSError: pass
    os.makedirs(DATA, exist_ok=True)

    copied_data = set()

    # 1) サイトファイルをコピー
    site_files = []
    for fn in sorted(os.listdir(SRC)):
        if fn in EXCLUDE:
            continue
        sp = os.path.join(SRC, fn)
        if not os.path.isfile(sp):
            continue
        shutil.copy2(sp, os.path.join(DIST, fn))
        site_files.append(fn)

    # 2) テキストファイル内のCSV参照を data/<basename> へ書換、参照CSVを data/ へコピー
    rewritten = 0
    for fn in site_files:
        ext = os.path.splitext(fn)[1].lower()
        if ext not in TEXT_EXT:
            continue
        path = os.path.join(DIST, fn)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        refs = set(REF_RE.findall(text))
        if not refs:
            continue
        for ref in refs:
            rel = ref.replace("../06.raw_data/", "")        # 例: aviation/fact_directflights.csv
            srccsv = os.path.join(RAW, rel)
            base = os.path.basename(rel)
            if not os.path.exists(srccsv):
                print("  WARN missing data:", rel)
                continue
            if base not in copied_data:
                shutil.copy2(srccsv, os.path.join(DATA, base))
                copied_data.add(base)
            text = text.replace(ref, "data/" + base)
            rewritten += 1
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

    # 3) 補助ファイル
    open(os.path.join(DIST, ".nojekyll"), "w").close()  # GitHub Pages 用
    with open(os.path.join(DIST, "README.md"), "w", encoding="utf-8") as f:
        f.write(
            "# インバウンド動向ダッシュボード（公開ビルド）\n\n"
            "このフォルダは静的ホスティング用の自己完結ビルドです。\n\n"
            "- すべてのページとデータ(`data/`)が同梱され、相対パスのみで動作します。\n"
            "- このフォルダの中身をそのまま公開先のルートに配置してください。\n\n"
            "## 公開前\n"
            "1. `analytics.js` の `GA_MEASUREMENT_ID` を自分のGA4測定IDに置換。\n\n"
            "## ホスティング候補\n"
            "- GitHub Pages / Cloudflare Pages / Netlify など（静的配信）。\n"
            "- ローカル確認: このフォルダで `python3 -m http.server 8000` → http://localhost:8000/\n\n"
            "## 再生成\n"
            "元データ更新後、リポジトリ直下で `python3 build_dist.py` を実行すると本フォルダが再生成されます。\n"
        )

    print("site files:", len(site_files))
    print("data files:", len(copied_data), sorted(copied_data))
    print("rewritten refs:", rewritten)
    print("DIST:", DIST)


if __name__ == "__main__":
    main()
