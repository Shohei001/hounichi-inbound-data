# インバウンド動向ダッシュボード

訪日外客数、旅行消費、宿泊、直行便などの公的統計を可視化する静的Webサイトです。

公開サイト: https://hounichi-inbound-data.pages.dev

## 構成

- `07.local_dashboard/`: HTML、CSS、JavaScriptなどのサイト本体
- `06.raw_data/`: 公開画面で使用する整形済みCSV
- `build_dist.py`: Cloudflare Pages向けの `dist/` 生成スクリプト

## ビルド

Python 3.11以降で、リポジトリ直下から次を実行します。

```bash
python3 build_dist.py
```

生成された `dist/` が公開対象です。追加パッケージは不要です。

## Cloudflare Pages設定

- Framework preset: `None`
- Build command: `python3 build_dist.py`
- Build output directory: `dist`
- Root directory: `/`

## データについて

掲載値は各ページに記載した公的統計をもとに整形しています。出典、更新時点、定義上の注意事項はサイト内の「出典・データ」ページをご確認ください。

## ライセンス・免責

本リポジトリのコードおよび掲載データの利用にあたっては、各原資料の利用条件もご確認ください。本サイトの情報は正確性を保証するものではありません。
