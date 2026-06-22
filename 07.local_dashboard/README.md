# ローカルダッシュボード

Looker Studioの代替として、PC上で確認できる簡易ダッシュボードです。

## 起動方法

 方法1: `start_dashboard.cmd` をダブルクリックします。

```text
07.local_dashboard/start_dashboard.cmd
```

方法2: PowerShellで `inbound-dashboard` に移動し、以下を実行します。

```bash
node 07.local_dashboard/server.mjs
```

方法3: `http-server` を使う場合。

```bash
npx.cmd http-server . -p 8080
```

ブラウザで以下を開きます。

```text
http://localhost:8080/07.local_dashboard/
```

データソース集は以下です。

```text
http://localhost:8080/07.local_dashboard/sources.html
```

## データソース集の確認日管理

データソース集の「次回確認」は、以下のCSVで管理します。

```text
06.raw_data/inbound_data_sources.csv
```

CSVの `next_check` に、確認推奨日または固定の確認頻度を入れます。
例: `2026-06-17`、`毎日`、`毎週`、`毎月`

## 使用データ

```text
06.raw_data/view_dashboard_monthly_visitors_manual.csv
06.raw_data/inbound_external_events.csv
06.raw_data/inbound_data_sources.csv
06.raw_data/inbound_customer_journey.csv
06.raw_data/inbound_leading_indicators.csv
06.raw_data/lodging_statistics/lodging_country_prefecture_monthly.csv
06.raw_data/aviation/aviation_monitor.csv
```

## 表示内容

- モニター: 全体動向、重点市場、カスタマージャーニー、国×訪問先、先行指標、外部要因イベント
- 詳細分析: 年度比較、年度×国、国別トレンド、複数国比較、ランキング、明細テーブル
- 市場ポートフォリオ: 規模×勢い、人数×単価、市場価値ランキング
- ジャーニー診断: 国別の来訪・滞在・再訪スコアとボトルネック
- データソース集: 情報源、更新頻度、最新更新、次回確認
