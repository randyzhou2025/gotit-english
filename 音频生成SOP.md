## 单词音频生成 SOP

### 1. 音频方案

使用 `edge-tts` 生成单词音频。

该方案不依赖 Azure Key，不需要安装 Microsoft Edge，也不要求 Windows 环境。当前不把 Azure 作为必选方案。

### 2. 推荐音色

| 类型 | 音色 |
|---|---|
| 英音 | `en-GB-SoniaNeural` |
| 美音 | `en-US-JennyNeural` |
| 中文普通话 | `zh-CN-XiaoxiaoNeural` |

当前产品逻辑中，英文自动听写默认使用英音。美音可以继续生成保留，后续如果恢复发音选择或扩展功能可直接使用。

### 3. 生成内容

每个单词生成三类音频：

| 文件       | 内容      | 用途        |
| -------- | ------- | --------- |
| `uk.mp3` | 英文单词，英音 | 英文听写      |
| `us.mp3` | 英文单词，美音 | 备用 / 后续扩展 |
| `zh.mp3` | 中文释义    | 中文听写      |
|          |         |           |
当前暂不生成美音，只生成英音。

听写规则：

- 英文听写：播放 `uk.mp3`，用户写英文单词。
- 中文听写：播放 `zh.mp3`，用户根据中文释义写英文单词。

### 4. 环境准备

安装 `edge-tts`：

```bash
python -m pip install edge-tts
```

确认安装成功：

```bash
python -m edge_tts --version
```

### 5. 批量生成

执行生成命令：

```bash
pnpm audio:generate
```

默认只生成 `uk.mp3` 与 `zh.mp3`（脚本默认值 `AUDIO_VARIANTS=uk,zh`）。如需补生成美音，显式指定：

```bash
AUDIO_VARIANTS=uk,us,zh pnpm audio:generate
```

生成目录：

```text
generated/audio
```

音频索引文件：

```text
src/data/audio.generated.json
```

注意：

- `audio.generated.json` 由脚本自动生成。
- 不要手动修改 `audio.generated.json`。
- 如果后续新增词库或 Unit，应重新执行音频生成流程。