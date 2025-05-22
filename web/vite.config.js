/*
 * @Author: wangqz
 * @Date: 2025-05-21
 * @LastEditTime: 2025-05-22
 * @Description: content
 */
export default {
	plugins: [],
	server: {
		proxy: {
			"/api": {
				target: "http://wz.djgo.cc:2334",
				changeOrigin: true,
				secure: false, // 允许代理到 HTTPS 目标（默认 true，可能需要关闭）
			},
		},
	},
};
