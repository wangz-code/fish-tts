'''
Author: wangqz
Date: 2025-05-20
LastEditTime: 2025-05-22
Description: content
'''
import torch
from transformers import pipeline
import os
import argparse
import shutil
def main():
    parser = argparse.ArgumentParser(description="使用whisper模型进行语音转录并保存结果")
    parser.add_argument("--dir", required=True, help="要创建的目录路径")
    args = parser.parse_args()
    path = "/home/wz/program/fish-speech/references/"+args.dir

    # 检查GPU是否可用并设置设备
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    print(f"使用设备: {device}")

    transcriber = pipeline(
        "automatic-speech-recognition", 
        model="BELLE-2/Belle-whisper-large-v3-turbo-zh",
        device=device
    )

    transcriber.model.config.forced_decoder_ids = (
      transcriber.tokenizer.get_decoder_prompt_ids(
        language="zh", 
        task="transcribe"
      )
    )
    # 处理长音频（开启时间戳）
    result = transcriber("audio.wav", return_timestamps=True)

    # 提取文本内容，忽略时间戳
    transcription = " ".join([chunk["text"].strip() for chunk in result["chunks"]])

    print("转录结果:")
    print(transcription)

    # 创建目录（支持嵌套）
    try:
        print("path:",path)
        os.makedirs(path, exist_ok=True)
    except Exception as e:
        print(f"错误：无法创建目录{path}: {str(e)}")
        return 1

    # 构建文件路径
    text_path = path+"/text.txt"
    audio_path = path+"/audio.wav"

    # 写入内容
    try:
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(transcription)
        print(f"已成功写入: {text_path}")

        shutil.copy2("/home/wz/program/distil-whisper/audio.wav",audio_path)  # 使用 copy2 保留元数据
        print(f"成功复制文件到: {audio_path}")
        return 0
    except Exception as e:
        print(f"错误：写入文件失败: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())