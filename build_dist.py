# -*- coding: utf-8 -*-
"""公開リポジトリ用の静的ビルド。同期時にbuild_dist.pyへ配置する正本。"""

import os
import re
import shutil


ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "07.local_dashboard")
RAW = os.path.join(ROOT, "06.raw_data")
DIST = os.path.join(ROOT, "dist")
DATA = os.path.join(DIST, "data")

EXCLUDE = {"server.mjs", "start_dashboard.cmd", "README.md"}
TEXT_EXT = {".html", ".js", ".css"}
REF_RE = re.compile(r"(?:\.\./)+06\.raw_data/[^'\"]+?\.csv")


def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST, ignore_errors=True)
        for directory, _, files in os.walk(DIST, topdown=False):
            for name in files:
                try:
                    os.remove(os.path.join(directory, name))
                except OSError:
                    pass
    os.makedirs(DATA, exist_ok=True)

    copied_data = set()
    site_files = []

    for source_root, dirs, files in os.walk(SRC):
        dirs[:] = sorted(
            directory for directory in dirs
            if directory not in {"__pycache__"}
        )
        for name in sorted(files):
            if name in EXCLUDE:
                continue
            source = os.path.join(source_root, name)
            relative = os.path.relpath(source, SRC)
            destination = os.path.join(DIST, relative)
            os.makedirs(os.path.dirname(destination), exist_ok=True)
            shutil.copy2(source, destination)
            site_files.append(relative)

    rewritten = 0
    for relative in site_files:
        extension = os.path.splitext(relative)[1].lower()
        if extension not in TEXT_EXT:
            continue
        path = os.path.join(DIST, relative)
        with open(path, encoding="utf-8") as source_file:
            text = source_file.read()
        for reference in set(REF_RE.findall(text)):
            raw_relative = reference.split("06.raw_data/", 1)[1]
            source_csv = os.path.join(RAW, raw_relative)
            basename = os.path.basename(raw_relative)
            if not os.path.exists(source_csv):
                print("  WARN missing data:", raw_relative)
                continue
            if basename not in copied_data:
                shutil.copy2(source_csv, os.path.join(DATA, basename))
                copied_data.add(basename)
            data_reference = os.path.relpath(
                DATA,
                os.path.dirname(path),
            ).replace("\\", "/")
            text = text.replace(reference, data_reference + "/" + basename)
            rewritten += 1
        with open(path, "w", encoding="utf-8") as destination_file:
            destination_file.write(text)

    open(os.path.join(DIST, ".nojekyll"), "w").close()
    with open(os.path.join(DIST, "README.md"), "w", encoding="utf-8") as readme:
        readme.write(
            "# インバウンド動向ダッシュボード（公開ビルド）\n\n"
            "このフォルダは静的ホスティング用の自己完結ビルドです。\n\n"
            "- すべてのページとデータ(`data/`)が同梱されています。\n"
            "- `python3 build_dist.py` で再生成できます。\n"
        )

    print("site files:", len(site_files))
    print("data files:", len(copied_data), sorted(copied_data))
    print("rewritten refs:", rewritten)
    print("DIST:", DIST)


if __name__ == "__main__":
    main()
