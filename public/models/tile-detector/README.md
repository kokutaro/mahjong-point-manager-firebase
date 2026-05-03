# 牌検出モデル配置ディレクトリ

`TfliteTileRecognizer` (`src/services/tileRecognition/tfliteRecognizer.ts`) はこのディレクトリ
配下のアセットをロードします。モデルファイル本体は **リポジトリにはコミットしません**
(`.gitignore` で除外)。各自で以下の手順で配置してください。

## 1. モデルのダウンロード

Roboflow Universe から TFLite 形式でエクスポートします。

- プロジェクト: <https://universe.roboflow.com/majmaster/master-oez61>
- Format: **TensorFlow Lite** (Float32 推奨)

ダウンロードした zip を展開し、含まれる `*.tflite` を `model.tflite` に
リネームしてこのディレクトリへ置きます。

```
public/models/tile-detector/model.tflite
```

## 2. ラベル定義 (任意)

クラス順序がデフォルト (`DEFAULT_TILE_LABELS`) と異なる場合、`labels.json` を
配置することで上書きできます。Roboflow の zip に含まれる `data.yaml` の `names`
配列をそのまま JSON 化すれば OK です。

```jsonc
// labels.json
[
  "1m",
  "2m",
  "3m",
  "4m",
  "5m",
  "6m",
  "7m",
  "8m",
  "9m",
  "1p",
  "2p",
  "3p",
  "4p",
  "5p",
  "6p",
  "7p",
  "8p",
  "9p",
  "1s",
  "2s",
  "3s",
  "4s",
  "5s",
  "6s",
  "7s",
  "8s",
  "9s",
  "1z",
  "2z",
  "3z",
  "4z",
  "5z",
  "6z",
  "7z",
  "0m",
  "0p",
  "0s",
]
```

## 3. 認識器の有効化

`.env.local` などに以下を追加してから `npm run dev` を実行します。

```
VITE_TILE_RECOGNIZER=tflite
```
