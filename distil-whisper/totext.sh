#!/bin/bash
###
 # @Author: wangqz
 # @Date: 2025-05-22
 # @LastEditTime: 2025-05-22
 # @Description: content
### 
source /home/wz/miniconda3/etc/profile.d/conda.sh
conda activate distil-whisper

echo "请输入目录名："
read dirname
python ~/program/distil-whisper/run.py --dir "$dirname"

