/*
 * @Author: wangqz
 * @Date: 2025-05-27
 * @LastEditTime: 2025-05-28
 * @Description: content
 */
class WAVStreamPlayer {
    constructor({ wavesurfer }) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = [];
        this.isPlaying = false;
        this.startTime = 0;
        this.pendingBuffer = null;
        this.wavesurfer = wavesurfer;

        this.chunks = [];
        this.totalBytes = 0;
    }
    async reloadWave() {
        const wavHeader = this.createWavHeader(this.totalBytes);
        const wavBlob = new Blob([wavHeader, ...this.chunks], { type: "audio/wav" });
        await this.wavesurfer.loadBlob(wavBlob);
        this.wavesurfer.setTime(0);
    }

    async start(url, packedData) {
        // 构建完整的请求配置
        // 设置请求头，通常包含内容类型和认证信息
        const requestHeaders = new Headers();
        requestHeaders.append("Content-Type", "application/msgpack"); // 二进制数据类型
        const requestConfig = {
            method: "POST",
            headers: requestHeaders,
            body: packedData,
        };
        // 发送请求并处理响应
        const response = await fetch(url, requestConfig);
        const reader = response.body.getReader();

        while (true) {
            const { done, value } = await reader.read();
            console.log("read log==>", done);
            if (value) {
                this.chunks.push(value);
                this.totalBytes += value.byteLength;
                this.reloadWave();
            }
            if (done) {
                // 处理最后剩余的数据（如果有）
                if (this.pendingBuffer && this.pendingBuffer.byteLength > 0) {
                    this.queueData(this.pendingBuffer);
                    this.pendingBuffer = null;
                }
                break;
            }
            // 合并缓存数据和新数据
            const combinedBuffer = this.mergeWithPending(value);
            // 按2048字节拆分数据块
            this.splitAndQueue(combinedBuffer);
            // 开始播放（确保有足够缓冲）
            if (!this.isPlaying && this.buffers.length > 44) {
                console.log("开始播放 log==>");
                this.playBuffers();
            }
        }
    }

    // 合并缓存数据和新数据
    mergeWithPending = (newBuffer) => {
        if (!this.pendingBuffer) {
            return newBuffer;
        }

        // 合并pendingBuffer和newBuffer
        const merged = new Uint8Array(this.pendingBuffer.byteLength + newBuffer.byteLength);
        merged.set(this.pendingBuffer, 0);
        merged.set(newBuffer, this.pendingBuffer.byteLength);

        // 清空pendingBuffer
        this.pendingBuffer = null;
        return merged;
    };

    // 按2048字节拆分数据并加入队列
    splitAndQueue = (buffer) => {
        const chunkSize = 1024;
        let offset = 0;

        // 拆分出完整的2048字节块
        while (offset + chunkSize <= buffer.byteLength) {
            const chunk = buffer.slice(offset, offset + chunkSize);
            this.queueData(chunk);
            offset += chunkSize;
        }

        // 保存剩余不足2048字节的数据
        if (offset < buffer.byteLength) {
            this.pendingBuffer = buffer.slice(offset);
        }
    };
    createWavHeader(dataLength, options = {}) {
        // 配置参数（默认值）
        const {
            sampleRate = 44100, // 采样率（Hz）
            channels = 1, // 声道数（1=单声道，2=立体声）
            bitDepth = 16, // 位深度（16位PCM）
        } = options;
        const buffer = new ArrayBuffer(44);
        const view = new DataView(buffer);

        // 辅助函数：写入字符串到 DataView
        function writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
        // RIFF 头部
        writeString(view, 0, "RIFF");
        view.setUint32(4, 36 + dataLength, true); // 文件总长度
        writeString(view, 8, "WAVE");

        // fmt 子块
        writeString(view, 12, "fmt ");
        view.setUint32(16, 16, true); // fmt 子块长度
        view.setUint16(20, 1, true); // 音频格式：PCM
        view.setUint16(22, channels, true); // 声道数
        view.setUint32(24, sampleRate, true); // 采样率
        view.setUint32(28, sampleRate * channels * (bitDepth / 8), true); // 字节率
        view.setUint16(32, channels * (bitDepth / 8), true); // 块对齐
        view.setUint16(34, bitDepth, true); // 位深度

        // data 子块
        writeString(view, 36, "data");
        view.setUint32(40, dataLength, true); // 音频数据长度

        return new Uint8Array(buffer);
    }

    queueData(pcmChunk) {
        // 将数据转换为Float32格式
        const int16Array = new Int16Array(pcmChunk.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0; // 16位转浮点
        }
        this.buffers.push(float32Array);
    }

    playBuffers() {
        this.isPlaying = true;
        const playNext = () => {
            if (this.buffers.length === 0) {
                this.isPlaying = false;
                return;
            }
            const buffer = this.buffers.shift();
            const audioBuffer = this.audioContext.createBuffer(1, buffer.length, 44100);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = buffer[i];
            }
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            if (this.startTime === 0) {
                this.startTime = this.audioContext.currentTime + 0.1; // 延迟0.1秒开始
            }
            source.start(this.startTime);
            this.startTime += audioBuffer.duration;

            // 下一块在上一块结束时播放
            source.onended = () => playNext();
        };

        playNext();
    }
}
