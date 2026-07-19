# LinguaLens — Real-time English Conversation Coach for Even G2

OpenAI Build Week 2026 提出作品（カテゴリ: Education）。締切: 2026-07-21 17:00 PDT (= 07-22 09:00 JST)。

## プロダクト定義（1文）

英会話中、Even G2 スマートグラスの HUD に「答えではなく思考を促すヒント」をそっと出す、装着型の英語会話コーチ。

## 誰の・何の課題か（当事者性）

日本人英語学習者（作者本人）は、実会話の最中に「言いたいことが出てこない」「相手の単語が聞き取れない」瞬間に学習機会を失う。スマホを見れば会話が壊れる。グラスの HUD なら視線を外さずに補助を受けられ、しかも答えを丸写しさせず「想起の手がかり」だけを出せば学習効果が残る（Belsky の "not an answer machine" 思想に整合）。

## プライマリユースケース（2026-07-19 追加・オーナー実体験）

作者は日常的に ChatGPT の GPT-Live（全二重音声）と英会話練習をしており、言い回しに詰まる瞬間が頻発する。LinguaLens は G2 マイクで「部屋の会話」を聞く設計のため、**相手が人間でも GPT-Live でも無改修で動作する**。GPT-Live 練習が主戦場、実会話が本番、という二段構え。運用: ChatGPT Voice をバックグラウンド再生にし Even アプリを前面に置く（プラグインは foreground 限定のため）。デモ動画のコアシーンはこの「GPT-Live と会話しながら HUD にヒントが出る」実機映像を使う。

## コア体験（1機能を完璧に）

会話モード（唯一のモード）:
1. G2 のマイクで会話音声を継続キャプチャ（bridge.audioControl → 16kHz PCM mono 16bit）
2. OpenAI ASR でリアルタイム文字起こし（自分と相手の英語）
3. GPT-5.6 が「コーチング介入判定」を実行し、必要な時だけ HUD に短いカードを出す:
   - **HINT**: 言い淀み・日本語混じりを検知 → **すぐ口に出せる完全な英文を1〜3択で提示、各選択肢に母国語（日本語）の短い意味ラベルを併記**（英文は各6語以内、日本語ラベルは3〜8文字。文脈の確信度が高ければ1文、曖昧なら最大3択。番号付き表示）。※2026-07-19 オーナー決定・変更不可: 当初の「最初の2語のみ」案は破棄。in-the-moment は実用性優先（完全文+母国語ラベル）、学習効果は RECAP と次回復習で担保する設計に変更。母国語は当面日本語固定、将来は設定切替
   - **WORD**: 相手の発話中の高難度語を検知 → 語 + 3語以内の平易な言い換え
   - **RECAP**: 会話の切れ目で、直近のやり取りから「今言えなかった表現1つ」を復習カードとして提示
4. セッション終了時（ダブルタップ）、学習ログを localStorage に保存し、次回起動時に前回の復習カードを1枚出す

静かさが正義: HUD 表示は最大2秒で読める分量。介入しすぎないこと自体が製品価値。GPT-5.6 に「介入しない」判定を明示的に許す。

## アーキテクチャ

```
[G2 glasses] --BLE--> [Even App WebView: 本アプリ]
                         ├─ AudioPipeline: PCM chunk → OpenAI transcription API
                         ├─ CoachEngine: transcript window → GPT-5.6 (structured output)
                         │    intervention: {type: HINT|WORD|RECAP|NONE, text, ttl}
                         └─ HudRenderer: container 更新（下記 BLE 予算）
[Desktop] evenhub-simulator = ミラービュー（デモ動画・審査員試用の主画面）
```

- SDK: `@evenrealities/even_hub_sdk`、テンプレートは `asr` ベース
- モデル方針（コスト最小・オーナー決定・変更不可）: 高頻度の介入判定は **gpt-5.6-luna**（GPT-5.6 ファミリーの最安モデル。公式カタログ確認済み: sol=フラッグシップ(alias gpt-5.6)/terra=中間/luna=コスト最適）、低頻度の RECAP 生成のみ **gpt-5.6**（=sol、Build Week の「GPT-5.6 で構築」要件を満たすため最低1箇所は本体を使う）。ASR は **gpt-4o-mini-transcribe**（実在確認済み）。モデル名はすべて src/models.ts に一元管理し、コードに散らさない
- API キー: 実行時に `OPENAI_API_KEY` を設定画面（初回起動セットアップ）で入力し localStorage 保存（レビュー要件: 再プロンプト禁止）

## HUD レイアウト & BLE 帯域予算（変更不可の制約）

`even-g2/developer-guide.md`「BLE帯域設計 Tips」と `/g2-ble-budget` スキルに準拠:

- ページ1枚のみ（会話モード）。コンテナ: TextContainer x3（ステータス行 / コーチカード本文 / 補助行）+ ImageContainer x1（ヒーロー: カードタイプアイコン、**200x100px 以内**）
- テキスト更新 ≥200ms 間隔、画像更新 ≥1000ms 間隔
- 画像は「1画面1ヒーロー」原則。迷ったらテキストで済ませる
- `rebuildPageContainer` 使用時は simulator stderr の `validation failed` を必ず確認
- 少なくとも1コンテナに `isEventCapture: 1`
- ダブルタップで `bridge.shutDownPageContainer(1)`（レビュー要件）

## マイルストーン

- **M1（今夜）**: simulator 上で E2E 成立 — マイク入力（simulator ではデスクトップマイクまたは音声ファイル注入）→ ASR → GPT-5.6 判定 → HUD カード表示。デモモード（録音済み会話サンプルでの再現実行）も実装
- **M2（7/20）**: 実機 G2 で QR サイドロード検証、コーチ品質チューニング、復習カード、初回セットアップ画面
- **M3（7/21）**: README（英語）、デモ動画撮影、.ehpk パッケージ、Devpost 提出

## 制約（変更不可）

- 実装は Codex セッションで行う（提出要件）
- `new Function()` / `eval()` 禁止（依存含む）— `grep -c "new Function" dist/*.js` = 0
- dist/assets のフラット化、app.json permissions: network + g2-microphone
- デモモード必須: 審査員がグラス・マイクなしでも `npm run demo` で全パイプラインを simulator 上で見られること
